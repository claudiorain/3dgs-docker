from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import threading
import queue
import logging

app = FastAPI()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ConvertRequest(BaseModel):
    input_dir: str



def stream_output(pipe, q):
    """Read output from pipe and put it in queue"""
    try:
        for line in iter(pipe.readline, ''):
            if line:
                q.put(line.strip())
    finally:
        pipe.close()

def log_from_queue(q, process):
    """Log messages from queue until process completes"""
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
    
    # Create process with pipes
    process = subprocess.Popen(
        command,
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,  # Line buffered
    )

    # Create queues for stdout and stderr
    stdout_queue = queue.Queue()
    stderr_queue = queue.Queue()

    # Create and start output reader threads
    stdout_thread = threading.Thread(
        target=stream_output, 
        args=(process.stdout, stdout_queue)
    )
    stderr_thread = threading.Thread(
        target=stream_output, 
        args=(process.stderr, stderr_queue)
    )

    # Create and start logging threads
    stdout_log_thread = threading.Thread(
        target=log_from_queue,
        args=(stdout_queue, process)
    )
    stderr_log_thread = threading.Thread(
        target=log_from_queue,
        args=(stderr_queue, process)
    )

    # Start all threads
    stdout_thread.start()
    stderr_thread.start()
    stdout_log_thread.start()
    stderr_log_thread.start()

    # Wait for process to complete
    process.wait()

    # Wait for threads to finish
    stdout_thread.join()
    stderr_thread.join()
    stdout_log_thread.join()
    stderr_log_thread.join()

    if process.returncode != 0:
        error_message = "Conversion failed"
        logger.error(error_message)
        raise HTTPException(
            status_code=500,
            detail={"error": error_message, "stderr": "Process error"}
        )

    logger.info("Conversion completed successfully")
    return {"message": "Conversion completed successfully"}
