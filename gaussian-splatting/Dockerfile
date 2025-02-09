FROM gaussian-splatting-base

WORKDIR /workspace/gaussian-splatting

# Copia il file api.py nella cartella di lavoro del container
COPY api.py /workspace/gaussian-splatting/api.py

RUN apt-get update && apt-get install -y libgl1-mesa-glx libx11-dev libglu1-mesa-dev 

#COLMAP
#
RUN conda update -n base conda && \
    conda install conda-forge::colmap


##
# Set the LD_LIBRARY_PATH
##
ENV LD_LIBRARY_PATH = "/usr/local/lib"

# Crea la cartella /tmp/runtime-root con i permessi giusti
RUN mkdir -p /tmp/runtime-root && chmod 0700 /tmp/runtime-root

ENV QT_QPA_PLATFORM=offscreen
ENV PYTHONUNBUFFERED=1

# Installa le dipendenze necessarie (fastapi, uvicorn)
RUN /bin/bash -c "source /opt/conda/etc/profile.d/conda.sh && conda activate gaussian_splatting && pip install fastapi uvicorn"

# Avvia FastAPI con Conda attivo
CMD ["/bin/bash", "-c", "source /opt/conda/etc/profile.d/conda.sh && conda activate gaussian_splatting && uvicorn api:app --host 0.0.0.0 --port 8050"]
