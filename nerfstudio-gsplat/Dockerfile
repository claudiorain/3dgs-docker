 FROM nerfstudio-gsplat
# Copia il file api.py nella cartella di lavoro del container

# Crea la cartella tmp/runtime-root con i permessi corretti
RUN mkdir -p /tmp/runtime-root && chmod 0700 /tmp/runtime-root

# Imposta variabili d'ambiente per FastAPI
ENV QT_QPA_PLATFORM=offscreen
ENV PYTHONUNBUFFERED=1

# Installa le dipendenze necessarie per FastAPI
RUN pip3 install fastapi uvicorn

# Espone la porta per FastAPI
EXPOSE 8103

# Comando per avviare FastAPI
CMD ["/bin/bash", "-c", "uvicorn api:app --host 0.0.0.0 --port 8103"]

