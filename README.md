1) 
# Rimuovi la vecchia versione
sudo apt remove nodejs npm

# Aggiungi il repository della versione LTS più recente
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installa Node.js
sudo apt-get install -y nodejs

# Verifica la versione
node --version  # Dovrebbe mostrare v20.x.x
npm --version   # Dovrebbe mostrare la versione compatibile di npm



1) Installa docker se non usi Docker Desktop
    sudo apt install -y docker

2) Installa docker-compose se non usi Docker Desktop
    sudo apt install -y docker-compose

3) Esegui docker-compose dalla root del progetto
   sudo docker-compose up --build

4) 
Accedi alla Console di AWS S3: Vai su AWS Management Console e accedi al tuo account AWS.

Accedi al tuo bucket S3: Nel menu dei servizi, cerca "S3" e seleziona il servizio. Poi, nella lista dei tuoi bucket, seleziona il bucket su cui vuoi configurare CORS.

Vai alla scheda "Permissions" (Autorizzazioni): Nella pagina del tuo bucket, clicca sulla scheda "Permissions" (Autorizzazioni) in alto.

Configura il CORS: Nella sezione "Permissions", vedrai una sottosezione chiamata CORS configuration (Configurazione CORS). Clicca su Edit (Modifica) per modificare la configurazione.

Aggiungi la configurazione CORS: Nella finestra di modifica, inserisci la configurazione CORS in formato XML. Ecco un esempio di configurazione CORS che consente l'accesso per il metodo PUT da tutti i domini (modifica i permessi come necessario per il tuo caso):

Comandi utili:
sudo docker-compose up -d --build: Effettua il build dell'applicazione
docker logs <container_name_or_id>
sudo docker-compose down: Rimuove i container ma mantiene i volumi
sudo docker-compose down -v: Rimuove i container E i volumi
sudo docker-compose down --rmi local: Rimuove i container e le immagini locali, ma mantiene i volumi
   