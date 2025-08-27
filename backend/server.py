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

# Azkar Models
class ZikrEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"  # For now, use default user
    zikr_id: int
    count: int
    date: str  # ISO date string (YYYY-MM-DD)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ZikrEntryCreate(BaseModel):
    zikr_id: int
    count: int
    date: str

class ZikrStats(BaseModel):
    zikr_id: int
    total_count: int
    total_sessions: int
    last_entry: Optional[datetime] = None

# Azkar data - this would typically come from a database
AZKAR_LIST = [
    {"id": 1, "nameAr": "سبحان الله وبحمده", "nameEn": "Subhan Allah wa Bi Hamdih", "color": "#FF6B6B"},
    {"id": 2, "nameAr": "سبحان الله العظيم وبحمده", "nameEn": "Subhan Allah al-Azeem wa Bi Hamdih", "color": "#4ECDC4"},
    {"id": 3, "nameAr": "سبحان الله وبحمده + استغفر الله وأتوب إليه", "nameEn": "Subhan Allah wa Bi Hamdih, Astaghfir Allah wa Atubu ilayh", "color": "#45B7D1"},
    {"id": 4, "nameAr": "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شئ قدير", "nameEn": "La ilaha illa Allah wahdahu la sharika lahu", "color": "#96CEB4"},
    {"id": 5, "nameAr": "لا حول ولا قوة إلا بالله", "nameEn": "La hawla wala quwwata illa billah", "color": "#FFEAA7"},
    {"id": 6, "nameAr": "سبحان الله", "nameEn": "Subhan Allah", "color": "#DDA0DD"},
    {"id": 7, "nameAr": "سبحان الله وبحمده سبحان الله العظيم", "nameEn": "Subhan Allah wa Bi Hamdih + Subhan Allah al-Azeem", "color": "#98D8C8"},
    {"id": 8, "nameAr": "سبحان الله والحمد لله ولا إله إلا الله والله أكبر", "nameEn": "Subhan Allah wa al-Hamdulillah wa la ilaha illa Allah, wa Allahu Akbar", "color": "#F7DC6F"},
    {"id": 9, "nameAr": "لا إله إلا أنت سبحانك إني كنت من الظالمين", "nameEn": "La ilaha illa anta subhanak inni kuntu min al-zalimeen", "color": "#BB8FCE"},
    {"id": 10, "nameAr": "الصلاة على النبي", "nameEn": "Salat Ala al-Nabi", "color": "#85C1E9"},
    {"id": 11, "nameAr": "استغفر الله وأتوب إليه", "nameEn": "Astaghfir Allah wa Atubu ilayh", "color": "#F8C471"},
    {"id": 12, "nameAr": "آيات قرأتها", "nameEn": "Verses I read of the Quran", "color": "#82E0AA"},
]

# Azkar endpoints
@api_router.get("/azkar")
async def get_azkar_list():
    """Get the list of available azkar"""
    return {"azkar": AZKAR_LIST}

@api_router.post("/azkar/entry", response_model=ZikrEntry)
async def create_zikr_entry(entry: ZikrEntryCreate):
    """Record a zikr entry"""
    zikr_dict = entry.dict()
    zikr_obj = ZikrEntry(**zikr_dict)
    await db.zikr_entries.insert_one(zikr_obj.dict())
    return zikr_obj

@api_router.get("/azkar/{zikr_id}/history")
async def get_zikr_history(zikr_id: int, days: Optional[int] = Query(30, description="Number of days to retrieve")):
    """Get history for a specific zikr"""
    entries = await db.zikr_entries.find(
        {"zikr_id": zikr_id, "user_id": "default"}
    ).sort("timestamp", -1).limit(days).to_list(days)
    
    # Convert ObjectId to string for JSON serialization
    for entry in entries:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    
    return {"entries": entries}

@api_router.get("/azkar/{zikr_id}/stats", response_model=ZikrStats)
async def get_zikr_stats(zikr_id: int):
    """Get statistics for a specific zikr"""
    pipeline = [
        {"$match": {"zikr_id": zikr_id, "user_id": "default"}},
        {"$group": {
            "_id": None,
            "total_count": {"$sum": "$count"},
            "total_sessions": {"$sum": 1},
            "last_entry": {"$max": "$timestamp"}
        }}
    ]
    
    result = await db.zikr_entries.aggregate(pipeline).to_list(1)
    
    if result:
        stats_data = result[0]
        return ZikrStats(
            zikr_id=zikr_id,
            total_count=stats_data.get("total_count", 0),
            total_sessions=stats_data.get("total_sessions", 0),
            last_entry=stats_data.get("last_entry")
        )
    else:
        return ZikrStats(
            zikr_id=zikr_id,
            total_count=0,
            total_sessions=0,
            last_entry=None
        )

@api_router.get("/azkar/daily/{date}")
async def get_daily_azkar(date: str):
    """Get all azkar entries for a specific date"""
    entries = await db.zikr_entries.find(
        {"date": date, "user_id": "default"}
    ).to_list(100)
    
    # Group by zikr_id and calculate totals
    daily_summary = {}
    total_daily = 0
    
    for entry in entries:
        zikr_id = entry["zikr_id"]
        count = entry["count"]
        
        if zikr_id not in daily_summary:
            daily_summary[zikr_id] = {"count": 0, "sessions": 0}
        
        daily_summary[zikr_id]["count"] += count
        daily_summary[zikr_id]["sessions"] += 1
        total_daily += count
    
    # Calculate percentages
    for zikr_id in daily_summary:
        if total_daily > 0:
            daily_summary[zikr_id]["percentage"] = round(
                (daily_summary[zikr_id]["count"] / total_daily) * 100, 1
            )
        else:
            daily_summary[zikr_id]["percentage"] = 0
    
    return {
        "date": date,
        "total_daily": total_daily,
        "azkar_summary": daily_summary,
        "entries": entries
    }

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