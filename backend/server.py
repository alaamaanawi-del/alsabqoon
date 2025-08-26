from fastapi import FastAPI, APIRouter, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Load Qur'an data once at startup (from local JSON)
QURAN_JSON_PATH = ROOT_DIR / 'quran_data.json'
with open(QURAN_JSON_PATH, 'r', encoding='utf-8') as f:
    QURAN_DATA = json.load(f)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class SurahMeta(BaseModel):
    number: int
    nameAr: str
    nameEn: str

class SearchResult(BaseModel):
    surahNumber: int
    nameAr: str
    nameEn: str
    ayah: int
    textAr: str
    en: Optional[str] = None
    es: Optional[str] = None
    tafseer: Optional[str] = None

# Health/basic routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Quran endpoints
@api_router.get('/quran/surahs', response_model=List[SurahMeta])
async def list_surahs():
    metas: List[SurahMeta] = [
        SurahMeta(number=s['number'], nameAr=s['surah'], nameEn=s.get('nameEn', f"Surah {s['number']}"))
        for s in QURAN_DATA['surahs']
    ]
    return metas

@api_router.get('/quran/search')
async def quran_search(
    query: str = Query(..., description="Search term in Arabic or translations"),
    bilingual: Optional[str] = Query(None, description="en, es, or tafseer to include interpretation snippet")
):
    q = query.strip()
    if not q:
        return {"results": []}

    # Tokenize simple words, require all tokens present (AND search)
    tokens = [t for t in q.split() if t]

    results: List[SearchResult] = []
    for s in QURAN_DATA['surahs']:
        for a in s['ayahs']:
            hay_ar = a['text']  # Updated field name
            
            # Search in Arabic text
            match_ar = all(tok in hay_ar for tok in tokens)
            
            # Search in tafseer if available
            match_tafseer = False
            tafseer_text = ""
            if 'tafsir' in a and a['tafsir']:
                for tafsir_item in a['tafsir']:
                    tafsir_text = tafsir_item.get('text', '')
                    if tafsir_text and all(tok in tafsir_text for tok in tokens):
                        match_tafseer = True
                        break
            
            if match_ar or match_tafseer:
                # Get the first tafseer text for display if requested
                first_tafseer = ""
                if bilingual == 'tafseer' and 'tafsir' in a and a['tafsir']:
                    first_tafseer = a['tafsir'][0].get('text', '') if a['tafsir'] else ""
                
                res = SearchResult(
                    surahNumber=s['number'],
                    nameAr=s['surah'],
                    nameEn=s.get('nameEn', f"Surah {s['number']}"),
                    ayah=a['ayah_number'], # Updated field name
                    textAr=a['text'],     # Updated field name
                    en=None,  # No English translation in this dataset
                    es=None,  # No Spanish translation in this dataset
                    tafseer=first_tafseer,
                )
                results.append(res)
                # Limit for performance
                if len(results) >= 100:
                    break
        if len(results) >= 100:
            break

    return {"results": [r.dict() for r in results]}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()