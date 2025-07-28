from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import threading
import queue
import logging
import re
import json

app = FastAPI()

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ConvertRequest(BaseModel):
    input_dir: str

def stream_output(pipe, q, output_list):
    try:
        for line in iter(pipe.readline, ''):
            if line:
                line = line.strip()
                q.put(line)
                output_list.append(line)
    finally:
        pipe.close()

def log_from_queue(q, process):
    while process.poll() is None or not q.empty():
        try:
            line = q.get_nowait()
            logger.info(line)
        except queue.Empty:
            continue

@app.post("/convert")
async def run_convert(request: ConvertRequest):
    command = f"python3 /workspace/gaussian-splatting/convert.py -s {request.input_dir}"
    logger.info(f"Starting conversion for directory: {request.input_dir}")

    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )

    stdout_queue = queue.Queue()
    stderr_queue = queue.Queue()

    stdout_lines = []
    stderr_lines = []

    # Threads for stdout
    stdout_thread = threading.Thread(
        target=stream_output,
        args=(process.stdout, stdout_queue, stdout_lines)
    )
    stdout_logger = threading.Thread(
        target=log_from_queue,
        args=(stdout_queue, process)
    )

    # Threads for stderr
    stderr_thread = threading.Thread(
        target=stream_output,
        args=(process.stderr, stderr_queue, stderr_lines)
    )
    stderr_logger = threading.Thread(
        target=log_from_queue,
        args=(stderr_queue, process)
    )

    # Start threads
    stdout_thread.start()
    stdout_logger.start()
    stderr_thread.start()
    stderr_logger.start()

    # Wait for completion
    process.wait()
    stdout_thread.join()
    stderr_thread.join()
    stdout_logger.join()
    stderr_logger.join()

    if process.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail={"error": "Conversion failed", "stderr": "\n".join(stderr_lines)}
        )

    # Cerca JSON tra i log letti
    stdout_text = "\n".join(stdout_lines)
    match = re.search(
        r"RECONSTRUCTION_PARAMS_JSON_START\n(.*?)\nRECONSTRUCTION_PARAMS_JSON_END",
        stdout_text,
        re.DOTALL
    )

    reconstruction_params = {}
    if match:
        try:
            reconstruction_params = json.loads(match.group(1))
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse reconstruction_params JSON: {e}")

    logger.info("Conversion completed successfully")

    return {
        "message": "Conversion completed successfully",
        "reconstruction_params": reconstruction_params
    }
