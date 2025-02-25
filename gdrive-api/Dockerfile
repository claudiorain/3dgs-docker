# Usa una base immagine Python
FROM python:3.9-slim

# Imposta la cartella di lavoro
WORKDIR /app

# Copia i file necessari nel container
COPY requirements.txt .

# Installa le dipendenze
RUN pip install --no-cache-dir -r requirements.txt

# Copia il codice dell'app
COPY . .

# Espone la porta su cui l'app FastAPI è in ascolto
EXPOSE 8000

# Comando per eseguire l'app con Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8090"]
