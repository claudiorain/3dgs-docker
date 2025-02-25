FROM 3dgs-mcmc-base

WORKDIR /workspace/3dgs-mcmc

# Copia il file api.py nella cartella di lavoro del container
COPY api.py /workspace/3dgs-mcmc/api.py

# Crea la cartella /tmp/runtime-root con i permessi giusti
RUN mkdir -p /tmp/runtime-root && chmod 0700 /tmp/runtime-root

ENV QT_QPA_PLATFORM=offscreen
ENV PYTHONUNBUFFERED=1

# Installa le dipendenze necessarie (fastapi, uvicorn)
RUN /bin/bash -c "source /opt/conda/etc/profile.d/conda.sh && conda activate 3dgs-mcmc-env && pip install fastapi uvicorn"

# Avvia FastAPI con Conda attivo
CMD ["/bin/bash", "-c", "source /opt/conda/etc/profile.d/conda.sh && conda activate 3dgs-mcmc-env && uvicorn api:app --host 0.0.0.0 --port 8050"]
