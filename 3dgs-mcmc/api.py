from fastapi import FastAPI, HTTPException
from pydantic import BaseModel,Field
from typing import  Dict, Any
import subprocess
import threading
import queue
import logging
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()


class TrainRequest(BaseModel):
    input_dir: str  
    output_dir: str
    params: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Parametri specifici dell'algoritmo (generati auto se quality_level specificato)"
    )  

class RenderRequest(BaseModel):
    output_dir: str  

class MetricsRequest(BaseModel):
    output_dir: str  

class DepthRegularizationRequest(BaseModel):
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

@app.post("/train")
def run_train(request: TrainRequest):
    logger.info(f"Starting training - Input directory: {request.input_dir}")
    logger.info(f"Output directory: {request.output_dir}")
    logger.info(f"Training params: {request.params}")   

    params = request.params

    # Create the "sparse" directory under input_dir if it doesn't exist
    sparse_dir = os.path.join(request.input_dir, "sparse")
    if not os.path.exists(sparse_dir):
        os.makedirs(sparse_dir)
        logger.info(f"Created sparse directory at {sparse_dir}")
    
    command = ["python3", "/workspace/3dgs-mcmc/train.py"  ]
    command.extend([
        "--init_type", "sfm",
        "-s", request.input_dir,
        "-m", request.output_dir
    ])

    # Tutti gli altri parametri automaticamente
    boolean_flags = {"eval"}  # Flag senza valori
    
    for param_key, value in params.items():
        if param_key in boolean_flags:
            # Flag booleani
            if value:
                command.append(f"--{param_key}")
        elif param_key != 'resolution':
            # Parametri normali con valore
            command.extend([f"--{param_key}", str(value)])
    logger.info(f"Command: {' '.join(command)}")
    
    # Create process with pipes
    try:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,  # Line buffered
        )
        logger.info(f"Process started with PID: {process.pid}")
    except Exception as e:
        logger.error(f"Failed to start process: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to start training process", "stderr": str(e)}
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

    command = f"python3 /workspace/3dgs-mcmc/render.py -m {request.output_dir}"
    logger.info(f"Render command: {command}")

    try:
        # Use simpler approach for render and metrics
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=3600  # 1 hour timeout
        )
        
        logger.info(f"Render process completed with return code: {result.returncode}")
        
        if result.stdout:
            logger.info(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            logger.error(f"STDERR:\n{result.stderr}")

        if result.returncode != 0:
            error_message = f"Render failed with return code: {result.returncode}"
            logger.error(error_message)
            raise HTTPException(
                status_code=500,
                detail={
                    "error": error_message, 
                    "return_code": result.returncode,
                    "stderr": result.stderr,
                    "stdout": result.stdout
                }
            )

        logger.info("Render completed successfully")
        return {"message": "Render completed successfully"}

    except subprocess.TimeoutExpired:
        logger.error("Render process timed out")
        raise HTTPException(
            status_code=500,
            detail={"error": "Render process timed out"}
        )
    except Exception as e:
        logger.error(f"Unexpected error during render: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Render failed", "exception": str(e)}
        )

@app.post("/metrics")
async def run_metrics(request: MetricsRequest):
    logger.info(f"Output directory: {request.output_dir}")

    command = f"python3 /workspace/3dgs-mcmc/metrics.py -m {request.output_dir}"
    logger.info(f"Metrics command: {command}")

    try:
        # Use simpler approach for metrics
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=1800  # 30 minutes timeout
        )
        
        logger.info(f"Metrics process completed with return code: {result.returncode}")
        
        if result.stdout:
            logger.info(f"STDOUT:\n{result.stdout}")
        if result.stderr:
            logger.error(f"STDERR:\n{result.stderr}")

        if result.returncode != 0:
            error_message = f"Metrics generation failed with return code: {result.returncode}"
            logger.error(error_message)
            raise HTTPException(
                status_code=500,
                detail={
                    "error": error_message, 
                    "return_code": result.returncode,
                    "stderr": result.stderr,
                    "stdout": result.stdout
                }
            )

        logger.info("Metrics generated successfully")
        return {"message": "Metrics generated successfully"}

    except subprocess.TimeoutExpired:
        logger.error("Metrics process timed out")
        raise HTTPException(
            status_code=500,
            detail={"error": "Metrics process timed out"}
        )
    except Exception as e:
        logger.error(f"Unexpected error during metrics generation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Generating metrics failed", "exception": str(e)}
        )
    
@app.post("/depth_regularization")
async def make_depth_regularization(request: DepthRegularizationRequest):
    logger.info(f"Starting depth generation and scaling - Input directory: {request.input_dir}")
        
    try:
        # =================================================================
        # STEP 1: Genera depth maps con Depth Anything V2
        # =================================================================
        logger.info("Step 1: Generating depth maps with Depth Anything V2...")
        
        # Crea directory per depth maps se non esiste
        images_dir = os.path.join(request.input_dir, 'images')
        depths_dir = os.path.join(request.input_dir, 'depths')
        depth_command = (
            f"cd /workspace/Depth-Anything-V2 && "
            f"python3 run.py --encoder vitl --pred-only --grayscale "
            f"--img-path {images_dir} --outdir {depths_dir}"
        )
        
        logger.info(f"Running depth generation: {depth_command}")
        
        # Esegui generazione depth maps
        depth_process = subprocess.Popen(
            depth_command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # Create queues for depth generation output
        depth_stdout_queue = queue.Queue()
        depth_stderr_queue = queue.Queue()
        
        # Create and start output reader threads for depth generation
        depth_stdout_thread = threading.Thread(
            target=stream_output,
            args=(depth_process.stdout, depth_stdout_queue)
        )
        depth_stderr_thread = threading.Thread(
            target=stream_output,
            args=(depth_process.stderr, depth_stderr_queue)
        )
        
        # Create and start logging threads for depth generation
        depth_stdout_log_thread = threading.Thread(
            target=log_from_queue,
            args=(depth_stdout_queue, depth_process)
        )
        depth_stderr_log_thread = threading.Thread(
            target=log_from_queue,
            args=(depth_stderr_queue, depth_process)
        )
        
        # Start all depth generation threads
        depth_stdout_thread.start()
        depth_stderr_thread.start()
        depth_stdout_log_thread.start()
        depth_stderr_log_thread.start()
        
        # Wait for depth generation to complete
        depth_process.wait()
        
        # Wait for depth generation threads to finish
        depth_stdout_thread.join()
        depth_stderr_thread.join()
        depth_stdout_log_thread.join()
        depth_stderr_log_thread.join()
        
        if depth_process.returncode != 0:
            error_message = "Depth generation failed"
            logger.error(error_message)
            raise HTTPException(
                status_code=500,
                detail={"error": error_message, "step": "depth_regularization"}
            )
        
        logger.info("✅ Depth maps generated successfully")
        
        # =================================================================
        # STEP 2: Genera depth_params.json con make_depth_scale.py
        # =================================================================
        logger.info("Step 2: Generating depth_params.json...")
        
        params_command = (
            f"python3 /workspace/3dgs-mcmc/utils/make_depth_scale.py "
            f"--base_dir {request.input_dir} --depths_dir {depths_dir}"
        )
        
        logger.info(f"Running depth params generation: {params_command}")
        
        # Esegui generazione depth_params.json
        params_process = subprocess.Popen(
            params_command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1
        )
        
        # Create queues for params generation output
        params_stdout_queue = queue.Queue()
        params_stderr_queue = queue.Queue()
        
        # Create and start output reader threads for params generation
        params_stdout_thread = threading.Thread(
            target=stream_output,
            args=(params_process.stdout, params_stdout_queue)
        )
        params_stderr_thread = threading.Thread(
            target=stream_output,
            args=(params_process.stderr, params_stderr_queue)
        )
        
        # Create and start logging threads for params generation
        params_stdout_log_thread = threading.Thread(
            target=log_from_queue,
            args=(params_stdout_queue, params_process)
        )
        params_stderr_log_thread = threading.Thread(
            target=log_from_queue,
            args=(params_stderr_queue, params_process)
        )
        
        # Start all params generation threads
        params_stdout_thread.start()
        params_stderr_thread.start()
        params_stdout_log_thread.start()
        params_stderr_log_thread.start()
        
        # Wait for params generation to complete
        params_process.wait()
        
        # Wait for params generation threads to finish
        params_stdout_thread.join()
        params_stderr_thread.join()
        params_stdout_log_thread.join()
        params_stderr_log_thread.join()
        
        if params_process.returncode != 0:
            error_message = "Depth params generation failed"
            logger.error(error_message)
            raise HTTPException(
                status_code=500,
                detail={"error": error_message, "step": "depth_params"}
            )
        
        logger.info("✅ depth_params.json generated successfully")
        
        # Conta le depth maps generate
        depth_files = [f for f in os.listdir(depths_dir) 
                      if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        depth_count = len(depth_files)
        
        if depth_count == 0:
            logger.error("No depth maps were generated")
            raise HTTPException(
                status_code=500,
                detail={"error": "No depth maps were generated", "dir": depths_dir}
            )
        
        logger.info(f"✅ Depth generation completed successfully - {depth_count} depth maps generated")
        
        return {
            "message": "Depth generation and params completed successfully",
            "depth_maps_count": depth_count,
            "depth_maps_dir": depths_dir
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during depth processing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"error": "Depth processing failed", "stderr": str(e)}
        )   