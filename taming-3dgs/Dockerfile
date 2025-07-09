# Usa l'immagine di Gaussian Splatting come base
FROM taming-3dgs

# Espone la porta per FastAPI
ARG API_PORT=8100
ENV API_PORT=$API_PORT
EXPOSE $API_PORT

WORKDIR /workspace/taming-3dgs

# Copia il file api.py nella cartella di lavoro del container
COPY api.py /workspace/taming-3dgs/api.py

# Crea la cartella tmp/runtime-root con i permessi corretti
RUN mkdir -p /tmp/runtime-root && chmod 0700 /tmp/runtime-root

# Imposta variabili d'ambiente per FastAPI
ENV QT_QPA_PLATFORM=offscreen
ENV PYTHONUNBUFFERED=1

# Installa le dipendenze necessarie per FastAPI
RUN pip3 install fastapi uvicorn

# Comando per avviare FastAPI
CMD ["/bin/bash", "-c", "uvicorn api:app --host 0.0.0.0 --port $API_PORT"]
