from fastapi import FastAPI, HTTPException
from pydantic import BaseModel,Field
from typing import  Dict, Any
import subprocess
import threading
import queue
import logging
import os
import time

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

@app.get("/")
def read_root():
    return {"message": "API is running!"}

def stream_output(pipe, q, stream_name):
    """Read output from pipe and put it in queue"""
    try:
        logger.info(f"Starting {stream_name} stream reader")
        for line in iter(pipe.readline, ''):
            if line:
                q.put((stream_name, line.strip()))
        logger.info(f"Finished {stream_name} stream reader")
    except Exception as e:
        logger.error(f"Error in {stream_name} stream reader: {e}")
        q.put((stream_name, f"STREAM_ERROR: {e}"))
    finally:
        pipe.close()

def log_from_queue(q, process, error_lines):
    """Log messages from queue until process completes"""
    logger.info("Starting queue logger")
    last_stdout_time = time.time()
    iteration_count = 0
    
    while True:
        try:
            # Check if process is still running or queue has items
            if process.poll() is not None and q.empty():
                break
                
            try:
                stream_name, line = q.get(timeout=2.0)
                current_time = time.time()
                
                if stream_name == "stderr":
                    logger.error(f"STDERR [{current_time:.1f}s]: {line}")
                    error_lines.append(line)
                else:
                    # Parse training progress per monitoraggio
                    if "Training progress:" in line:
                        iteration_count += 1
                        last_stdout_time = current_time
                        if iteration_count % 100 == 0:  # Log ogni 100 iterazioni
                            logger.info(f"PROGRESS [{iteration_count}]: {line}")
                    elif any(keyword in line for keyword in ["ITER", "Evaluating", "Saving", "Error", "Exception", "Traceback"]):
                        logger.info(f"STDOUT [{current_time:.1f}s]: {line}")
                        last_stdout_time = current_time
                    # Skip normale training progress logging per ridurre spam
                        
            except queue.Empty:
                current_time = time.time()
                # Se non riceviamo output da più di 30 secondi, potrebbe essere un hang
                if current_time - last_stdout_time > 30:
                    logger.warning(f"No output received for {current_time - last_stdout_time:.1f} seconds")
                    last_stdout_time = current_time
                continue
                
        except Exception as e:
            logger.error(f"Error in queue logger: {e}")
            break
    
    logger.info(f"Queue logger finished. Total iterations logged: {iteration_count}")

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
        "--resolution", "1",
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

    # Create queue for both stdout and stderr
    output_queue = queue.Queue()
    error_lines = []  # Collect error lines

    # Create and start output reader threads
    stdout_thread = threading.Thread(
        target=stream_output, 
        args=(process.stdout, output_queue, "stdout")
    )
    stderr_thread = threading.Thread(
        target=stream_output, 
        args=(process.stderr, output_queue, "stderr")
    )

    # Create and start logging thread
    log_thread = threading.Thread(
        target=log_from_queue,
        args=(output_queue, process, error_lines)
    )

    # Start all threads
    stdout_thread.start()
    stderr_thread.start()
    log_thread.start()

    try:
        logger.info("Waiting for process to complete...")
        start_time = time.time()
        
        # Monitor process con timeout più lungo e checkpoint
        while process.poll() is None:
            time.sleep(5)  # Check ogni 5 secondi
            elapsed = time.time() - start_time
            
            # Log checkpoint ogni 5 minuti
            if elapsed % 300 < 5:  # ogni ~5 minuti
                logger.info(f"Training still running... Elapsed: {elapsed/60:.1f} minutes")
            
            # Timeout molto lungo per training completo (2 ore)
            if elapsed > 7200:  
                logger.error("Training timeout after 2 hours")
                process.kill()
                raise subprocess.TimeoutExpired(command, 7200)
        
        return_code = process.returncode
        total_time = time.time() - start_time
        logger.info(f"Process completed with return code: {return_code} after {total_time/60:.1f} minutes")

        # Give threads a moment to finish processing remaining output
        time.sleep(3)

        # Wait for threads to finish
        logger.info("Waiting for threads to finish...")
        stdout_thread.join(timeout=15)
        stderr_thread.join(timeout=15)
        log_thread.join(timeout=15)
        
        logger.info("All threads finished")

        if return_code != 0:
            error_message = f"Training failed with return code: {return_code}"
            logger.error(error_message)
            
            # Analizza il tipo di errore basato sul return code
            if return_code == -9:
                error_type = "Out of Memory (SIGKILL)"
            elif return_code == -11:
                error_type = "Segmentation Fault (SIGSEGV)"
            elif return_code == -6:
                error_type = "Abort Signal (SIGABRT)"
            elif return_code == 1:
                error_type = "General Error"
            elif return_code == 2:
                error_type = "Misuse of shell builtins"
            else:
                error_type = f"Unknown signal ({return_code})"
            
            logger.error(f"Error type identified: {error_type}")
            
            # Collect error details
            stderr_content = "\n".join(error_lines[-30:]) if error_lines else "No stderr output captured"
            logger.error(f"Last 30 stderr lines:\n{stderr_content}")
            
            # Aggiungi informazioni specifiche per debug
            debug_info = {
                "process_duration_minutes": total_time / 60,
                "total_stderr_lines": len(error_lines),
                "error_type": error_type,
                "command_executed": " ".join(command)
            }
            
            raise HTTPException(
                status_code=500,
                detail={
                    "error": error_message, 
                    "return_code": return_code,
                    "error_type": error_type,
                    "stderr": stderr_content,
                    "debug_info": debug_info
                }
            )

        logger.info("Training completed successfully")
        return {
            "message": "Training completed successfully",
            "return_code": return_code,
            "stderr_lines_count": len(error_lines)
        }

    except subprocess.TimeoutExpired:
        logger.error("Training process timed out")
        process.kill()
        raise HTTPException(
            status_code=500,
            detail={"error": "Training process timed out", "stderr": "Process killed due to timeout"}
        )
    except Exception as e:
        logger.error(f"Unexpected error during training: {str(e)}")
        # Ensure process is terminated if something goes wrong
        if process.poll() is None:
            logger.info("Killing process due to error")
            process.kill()
        
        # Collect any available error output
        stderr_content = "\n".join(error_lines[-10:]) if error_lines else "No stderr output captured"
        
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Training failed with exception", 
                "exception": str(e),
                "stderr": stderr_content
            }
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