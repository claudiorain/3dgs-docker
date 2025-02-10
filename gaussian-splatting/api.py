from fastapi import FastAPI
from pydantic import BaseModel
import subprocess

app = FastAPI()

class ConvertRequest(BaseModel):
    input_dir: str  # Deve corrispondere al payload che invii

class TrainRequest(BaseModel):
    input_dir: str  # Deve corrispondere al payload che invii
    output_dir: str  # Deve corrispondere al payload che invii


@app.get("/")
def read_root():
    return {"message": "API is running!"}

@app.post("/convert")
def run_convert(request: ConvertRequest):
    command = f"python /workspace/gaussian-splatting/convert.py -s {request.input_dir}"
    
    print("Target directory:" + request.input_dir)
    process = subprocess.Popen(
        command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )

    stdout, stderr = process.communicate()  # Legge tutto l'output

    print(f"STDOUT:\n{stdout}")  # Mostra il log dell'output
    print(f"STDERR:\n{stderr}")

    return {"stdout": stdout, "stderr": stderr}

@app.post("/train")
def run_train(request: TrainRequest):
    print("Input directory:" + request.input_dir)
    print("Input directory:" + request.output_dir)

    command = f"python /workspace/gaussian-splatting/train.py -s {request.input_dir} -m {request.output_dir} --densify_grad_threshold 0.001 --densification_interval 500 --densify_until_iter 7000 --test_iterations -1"
    
    process = subprocess.Popen(
        command, 
        shell=True, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True  # Decodifica direttamente in stringhe
    )

    stdout, stderr = process.communicate()  # Legge tutto l'output

    print(f"STDOUT:\n{stdout}")  # Mostra il log dell'output
    print(f"STDERR:\n{stderr}")

    return {"stdout": stdout, "stderr": stderr}
