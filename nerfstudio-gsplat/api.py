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

class TrainRequest(BaseModel):
    input_dir: str  
    output_dir: str  
    train_type: str


class RenderRequest(BaseModel):
    output_dir: str  

class MetricsRequest(BaseModel):
    output_dir: str  

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


@app.post("/train")
async def run_train(request: TrainRequest):
    logger.info(f"Starting training - Input directory: {request.input_dir}")
    logger.info(f"Output directory: {request.output_dir}")
    logger.info(f"Train type: {request.train_type}")
    command = f"CUDA_VISIBLE_DEVICES=0 python3 /workspace/gaussian-splatting/examples/simple_trainer.py {request.train_type} --data_dir {request.input_dir} --data_factor 1 --result_dir {request.output_dir} "

    
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

    try:
        # Wait for process to complete with timeout
        process.wait()

        # Wait for threads to finish
        stdout_thread.join()
        stderr_thread.join()
        stdout_log_thread.join()
        stderr_log_thread.join()

        if process.returncode != 0:
            error_message = "Training failed"
            logger.error(error_message)
            raise HTTPException(
                status_code=500,
                detail={"error": error_message, "stderr": "Process error"}
            )

        logger.info("Training completed successfully")
        return {"message": "Training completed successfully"}

    except Exception as e:
        logger.error(f"Unexpected error during training: {str(e)}")
        # Ensure process is terminated if something goes wrong
        process.kill()
        raise HTTPException(
            status_code=500,
            detail={"error": "Training failed", "stderr": str(e)}
        )


@app.post("/render")
async def run_render(request: RenderRequest):
    logger.info(f"Output directory: {request.output_dir}")

    command = f"python3 /workspace/gaussian-splatting/render.py -m {request.output_dir}"

    
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

    try:
        # Wait for process to complete with timeout
        process.wait()

        # Wait for threads to finish
        stdout_thread.join()
        stderr_thread.join()
        stdout_log_thread.join()
        stderr_log_thread.join()

        if process.returncode != 0:
            error_message = "Render failed"
            logger.error(error_message)
            raise HTTPException(
                status_code=500,
                detail={"error": error_message, "stderr": "Process error"}
            )

        logger.info("Render completed successfully")
        return {"message": "Render completed successfully"}

    except Exception as e:
        logger.error(f"Unexpected error during render: {str(e)}")
        # Ensure process is terminated if something goes wrong
        process.kill()
        raise HTTPException(
            status_code=500,
            detail={"error": "Render failed", "stderr": str(e)}
        )

@app.post("/metrics")
async def run_render(request: MetricsRequest):
    logger.info(f"Output directory: {request.output_dir}")

    command = f"python3 /workspace/gaussian-splatting/metrics.py -m {request.output_dir}"

    
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

    try:
        # Wait for process to complete with timeout
        process.wait()

        # Wait for threads to finish
        stdout_thread.join()
        stderr_thread.join()
        stdout_log_thread.join()
        stderr_log_thread.join()

        if process.returncode != 0:
            error_message = "Generating metrics failed"
            logger.error(error_message)
            raise HTTPException(
                status_code=500,
                detail={"error": error_message, "stderr": "Process error"}
            )

        logger.info("Metrics generated successfully")
        return {"message": "Metrics generated successfully"}

    except Exception as e:
        logger.error(f"Unexpected error during metrics generation: {str(e)}")
        # Ensure process is terminated if something goes wrong
        process.kill()
        raise HTTPException(
            status_code=500,
            detail={"error": "Generating metrics failed", "stderr": str(e)}
        )

