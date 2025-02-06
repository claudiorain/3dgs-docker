1) Installa docker se non usi Docker Desktop
    sudo apt install -y docker

2) Installa docker-compose se non usi Docker Desktop
    sudo apt install -y docker-compose

3) Esegi docker-compose dalla root del progetto
   sudo docker-compose up --build

Comandi utili:
sudo docker-compose up -d --build: Effettua il build dell'applicazione
docker logs <container_name_or_id>
sudo docker-compose down: Rimuove i container ma mantiene i volumi
sudo docker-compose down -v: Rimuove i container E i volumi
sudo docker-compose down --rmi local: Rimuove i container e le immagini locali, ma mantiene i volumi
   