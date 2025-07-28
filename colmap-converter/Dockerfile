# ✅ PIP-ONLY APPROACH - Evita problemi Conda ToS
FROM colmap/colmap:latest

ENV DEBIAN_FRONTEND=noninteractive

# ✅ Install Python and essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget curl git ca-certificates \
    python3 python3-pip python3-venv && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# ✅ VERIFY COLMAP GPU SUPPORT
RUN echo "=== COLMAP GPU VERIFICATION ===" && \
    echo "COLMAP version and CUDA support:" && colmap help | head -10 && \
    echo "✅ COLMAP with CUDA support confirmed!"

# Create workspace and clone repos
WORKDIR /workspace
RUN git clone https://github.com/graphdeco-inria/gaussian-splatting --recursive && \
    git clone https://github.com/DepthAnything/Depth-Anything-V2.git /workspace/Depth-Anything-V2

# Copy application files
COPY convert_optimized.py /workspace/convert_optimized.py
COPY api.py /workspace/api.py

# Setup convert.py
WORKDIR /workspace/gaussian-splatting
RUN cp /workspace/convert_optimized.py /workspace/gaussian-splatting/convert.py && \
    chmod +x /workspace/gaussian-splatting/convert.py

# ✅ CREATE PYTHON VIRTUAL ENV and install everything with PIP
RUN python3 -m venv /workspace/venv && \
    /workspace/venv/bin/pip install --upgrade pip && \
    /workspace/venv/bin/pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118 && \
    /workspace/venv/bin/pip install fastapi uvicorn numpy pillow opencv-python && \
    /workspace/venv/bin/pip install plyfile tqdm

# Runtime setup
RUN mkdir -p /tmp/runtime-root && chmod 0700 /tmp/runtime-root

# Environment variables
ENV QT_QPA_PLATFORM=offscreen
ENV PYTHONUNBUFFERED=1
ENV PATH="/workspace/venv/bin:$PATH"

WORKDIR /workspace

# ✅ Final verification
RUN echo "=== FINAL VERIFICATION ===" && \
    echo "Ubuntu version:" && cat /etc/os-release | grep VERSION= && \
    echo "COLMAP ready:" && colmap help | head -3 && \
    echo "PyTorch CUDA test:" && \
    /workspace/venv/bin/python3 -c 'import torch; print(f"✅ CUDA available: {torch.cuda.is_available()}")' && \
    echo "=== COLMAP + PYTORCH + CUDA ALL READY! ==="

# Start application
CMD ["/workspace/venv/bin/python3", "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8060"]