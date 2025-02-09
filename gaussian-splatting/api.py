from fastapi import FastAPI
from pydantic import BaseModel
import subprocess

app = FastAPI()

class ConvertRequest(BaseModel):
    target_dir: str  # Deve corrispondere al payload che invii


@app.get("/")
def read_root():
    return {"message": "API is running!"}

@app.post("/convert")
def run_convert(request: ConvertRequest):
    command = f"python /workspace/gaussian-splatting/convert.py -s {request.target_dir}"
    
    print("Target directory:" + request.target_dir)
    process = subprocess.Popen(
        command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )

    stdout_log = []
    stderr_log = []

    # Legge l'output in tempo reale
    for line in iter(process.stdout.readline, ''):
        stdout_log.append(line.strip())
        print(f"STDOUT: {line.strip()}")  # Stampa nel log del container

    for line in iter(process.stderr.readline, ''):
        stderr_log.append(line.strip())
        print(f"STDERR: {line.strip()}")  # Stampa nel log del container

    process.stdout.close()
    process.stderr.close()
    process.wait()  # Aspetta la fine del processo

    return {"stdout": stdout_log, "stderr": stderr_log}

@app.post("/train")
def run_train(input_path: str):
    command = f"python /workspace/gaussian-splatting/train.py -s {input_path} --densify_grad_threshold 0.001 --densification_interval 500 --densify_until_iter 7000 --test_iterations -1"
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    return {"stdout": result.stdout, "stderr": result.stderr}
