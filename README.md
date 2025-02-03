1) Installa docker-compose se non usi Docker Desktop
    sudo apt install -y docker-compose

2) Esegui docker-compose dalla root del progetto
   docker-compose up --build

Comandi utili:
docker-compose up -d --build: Effettua il build dell'applicazione

docker-compose down: Rimuove i container ma mantiene i volumi
docker-compose down -v: Rimuove i container E i volumi
docker-compose down --rmi local: Rimuove i container e le immagini locali, ma mantiene i volumi
   