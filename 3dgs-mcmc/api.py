from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import sys

app = FastAPI()

class ConvertRequest(BaseModel):
    input_dir: str  

class TrainRequest(BaseModel):
    input_dir: str  
    output_dir: str  


@app.get("/")
def read_root():
    return {"message": "API is running!"}

def log_output(pipe, log_func):
    for line in iter(pipe.readline, b''):
        log_func(line.strip())  # Già una stringa, quindi possiamo direttamente usarla
        sys.stdout.flush()  # Assicurati di flushare subito l'output

@app.post("/convert")
def run_convert(request: ConvertRequest):
    command = f"python /workspace/3dgs-mcmc/convert.py -s {request.input_dir}"
    
    print("Target directory:", request.input_dir)
    process = subprocess.Popen(
        command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )

    # Log output in tempo reale
    from threading import Thread
    stdout_thread = Thread(target=log_output, args=(process.stdout, print))
    stderr_thread = Thread(target=log_output, args=(process.stderr, print))
    
    stdout_thread.start()
    stderr_thread.start()

    process.wait()  # Aspetta che il processo termini

    # Assicurati che i thread terminino
    stdout_thread.join()
    stderr_thread.join()

    if process.returncode != 0:  # Controlla se il comando è fallito
        raise HTTPException(status_code=500, detail={"error": "Conversion failed", "stderr": "Process error"})

    return {"message": "Conversion completed successfully"}

@app.post("/train")
def run_train(request: TrainRequest):
    print("Input directory:", request.input_dir)
    print("Output directory:", request.output_dir)

    command = f"python /workspace/3dgs-mcmc/train.py -s {request.input_dir} -m {request.output_dir} --cap_max 1000000 --scale_reg 0.01 --opacity_reg 0.001 --noise_lr 5e5 --init_type sfm"
    
    process = subprocess.Popen(
        command, 
        shell=True, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True  
    )

    # Log output in tempo reale
    from threading import Thread
    stdout_thread = Thread(target=log_output, args=(process.stdout, print))
    stderr_thread = Thread(target=log_output, args=(process.stderr, print))
    
    stdout_thread.start()
    stderr_thread.start()

    process.wait()  # Aspetta che il processo termini

    # Assicurati che i thread terminino
    stdout_thread.join()
    stderr_thread.join()

    if process.returncode != 0:  # Controlla se il comando è fallito
        raise HTTPException(status_code=500, detail={"error": "Training failed", "stderr": "Process error"})

    return {"message": "Training completed successfully"}
