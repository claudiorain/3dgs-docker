from fastapi import FastAPI, File, UploadFile
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseDownload
from google.oauth2.credentials import Credentials
import os
import pickle
import io
from typing import List

app = FastAPI()

# Permessi dell'API
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def authenticate():
    creds = None
    # Il file token.pickle memorizza il token di accesso dell'utente.
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('/app/credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    return creds

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    creds = authenticate()
    service = build('drive', 'v3', credentials=creds)

    file_metadata = {'name': file.filename}
    media = MediaFileUpload(file.file, mimetype='application/octet-stream')
    
    uploaded_file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
    
    return {"file_id": uploaded_file['id']}

@app.get("/download/{file_id}")
async def download_file(file_id: str):
    creds = authenticate()
    service = build('drive', 'v3', credentials=creds)

    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()

    # Salva il file scaricato localmente
    with open(f"downloaded_{file_id}.txt", 'wb') as f:
        f.write(fh.getvalue())
    
    return {"message": "File downloaded successfully"}

@app.get("/files")
async def list_files():
    creds = authenticate()
    service = build('drive', 'v3', credentials=creds)

    results = service.files().list(pageSize=10, fields="nextPageToken, files(id, name)").execute()
    items = results.get('files', [])

    files_list = [{'id': item['id'], 'name': item['name']} for item in items]

    return files_list
