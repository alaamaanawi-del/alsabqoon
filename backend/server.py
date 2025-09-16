from fastapi import FastAPI, APIRouter, Query, HTTPException
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
import pytz
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

def get_user_timezone_now(timezone_name: str = None):
    """Get current time in user's timezone or UTC if not provided"""
    try:
        if timezone_name:
            user_tz = pytz.timezone(timezone_name)
            return datetime.now(user_tz)
        else:
            # Fallback to UTC if no timezone provided
            return datetime.now(pytz.UTC)
    except Exception as e:
        logger.warning(f"Invalid timezone {timezone_name}, falling back to UTC: {e}")
        return datetime.now(pytz.UTC)

def create_timestamp_from_client(client_timestamp: str = None, timezone_name: str = None):
    """Create timestamp from client or use current time in user's timezone"""
    try:
        if client_timestamp:
            # If client sends exact timestamp, use it
            return datetime.fromisoformat(client_timestamp.replace('Z', '+00:00'))
        else:
            # Otherwise, use current time in user's timezone
            return get_user_timezone_now(timezone_name)
    except Exception as e:
        logger.warning(f"Error parsing client timestamp {client_timestamp}: {e}")
        return get_user_timezone_now(timezone_name)

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
    timestamp: datetime = Field(default_factory=lambda: get_user_timezone_now())

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
    timestamp: datetime = Field(default_factory=lambda: get_user_timezone_now())
    edit_notes: Optional[List[str]] = []  # Track edit history

class ZikrEntryCreate(BaseModel):
    zikr_id: int
    count: int
    date: str
    timezone: Optional[str] = None  # User's device timezone (e.g., "America/New_York")
    client_timestamp: Optional[str] = None  # Exact timestamp from client device
    comment: Optional[str] = None  # Optional comment for the entry

class ZikrEntryUpdate(BaseModel):
    count: int
    edit_note: Optional[str] = None
    timezone: Optional[str] = None  # User's device timezone for edit timestamp
    client_timestamp: Optional[str] = None  # Exact timestamp from client device

class ZikrStats(BaseModel):
    zikr_id: int
    total_count: int
    total_sessions: int
    last_entry: Optional[datetime] = None

# Charity Models
class CharityEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "default"  # For now, use default user
    charity_id: int
    count: int
    date: str  # ISO date string (YYYY-MM-DD)
    timestamp: datetime = Field(default_factory=lambda: get_user_timezone_now())
    comments: Optional[str] = ""  # User comments/notes
    edit_notes: Optional[List[str]] = []  # Track edit history

class CharityEntryCreate(BaseModel):
    charity_id: int
    count: int
    date: str
    comments: Optional[str] = ""
    timezone: Optional[str] = None  # User's device timezone
    client_timestamp: Optional[str] = None  # Exact timestamp from client device

class CharityEntryUpdate(BaseModel):
    count: int
    comments: Optional[str] = ""
    edit_note: Optional[str] = None
    timezone: Optional[str] = None  # User's device timezone for edit timestamp
    client_timestamp: Optional[str] = None  # Exact timestamp from client device

class CharityStats(BaseModel):
    charity_id: int
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
    {"id": 13, "nameAr": "الدعوة – تعليم", "nameEn": "Da'wah - Teaching Islam", "color": "#FF9F43"},
]

# Charity data - 32 categories with multi-language support
CHARITY_LIST = [
    {"id": 1, "nameAr": "الصدقة الصباحية", "nameEn": "Morning Charity", "nameEs": "Caridad de la mañana", "color": "#FF6B6B", "description": "صدقة تتم في الصباح للبركة في اليوم"},
    {"id": 2, "nameAr": "الصدقة على الزوجة والأولاد", "nameEn": "Charity for Wife and Kids", "nameEs": "Caridad para la esposa y los hijos", "color": "#4ECDC4", "description": "النفقة على الأهل والأطفال من أنواع الصدقة"},
    {"id": 3, "nameAr": "الصدقة على الأقارب", "nameEn": "Charity for Relatives", "nameEs": "Caridad para los familiares", "color": "#45B7D1", "description": "صدقة على الأقارب والأرحام لصلة الرحم"},
    {"id": 4, "nameAr": "صلاة الضحى", "nameEn": "Duha Prayer (Salah al-Duha)", "nameEs": "Oración Duha (Salah al-Duha)", "color": "#96CEB4", "description": "صلاة الضحى من النوافل المستحبة"},
    {"id": 5, "nameAr": "الصدقة لتعليم الإسلام", "nameEn": "Charity to Teach Islam", "nameEs": "Caridad para enseñar el Islam", "color": "#FFEAA7", "description": "الإنفاق في سبيل تعليم الدين الإسلامي"},
    {"id": 6, "nameAr": "إطعام الفقراء", "nameEn": "Feed the Poor", "nameEs": "Alimentar a los pobres", "color": "#DDA0DD", "description": "إطعام المحتاجين والفقراء"},
    {"id": 7, "nameAr": "إطعام اليتيم", "nameEn": "Feed an Orphan", "nameEs": "Alimentar a un huérfano", "color": "#98D8C8", "description": "إطعام الأيتام له أجر عظيم"},
    {"id": 8, "nameAr": "دعم اليتيم", "nameEn": "Support an Orphan", "nameEs": "Apoyar a un huérfano", "color": "#F7DC6F", "description": "الدعم المالي أو المعنوي لليتامى"},
    {"id": 9, "nameAr": "الصدقة على الوالدين", "nameEn": "Charity for Parents", "nameEs": "Caridad para los padres", "color": "#BB8FCE", "description": "بر الوالدين والإنفاق عليهما"},
    {"id": 10, "nameAr": "إقراض الله تعالى", "nameEn": "Lending to Allah (Qardh to Allah)", "nameEs": "Prestar a Allah (Qardh a Allah)", "color": "#85C1E9", "description": "القرض الحسن في سبيل الله"},
    {"id": 11, "nameAr": "الصدقة للمتوفى", "nameEn": "Charity for the Deceased", "nameEs": "Caridad para el difunto", "color": "#F8C471", "description": "الصدقة على روح المتوفى"},
    {"id": 12, "nameAr": "الصدقة على الحيوانات", "nameEn": "Charity for Animals", "nameEs": "Caridad para los animales", "color": "#82E0AA", "description": "الرفق بالحيوان والإحسان إليها"},
    {"id": 13, "nameAr": "إفطار الصائم", "nameEn": "Food for a Fasting Person", "nameEs": "Iftar para la persona que ayuna", "color": "#F9E79F", "description": "إطعام الصائمين له أجر عظيم"},
    {"id": 14, "nameAr": "الصدقة الجارية", "nameEn": "Running Charity", "nameEs": "Caridad continua", "color": "#D7BDE2", "description": "الصدقة التي يستمر نفعها بعد الموت"},
    {"id": 15, "nameAr": "إطعام الجيران", "nameEn": "Food for the Neighbors", "nameEs": "Comida para los vecinos", "color": "#AED6F1", "description": "إكرام الجيران بالطعام"},
    {"id": 16, "nameAr": "الصدقة لغير المسلمين", "nameEn": "Charity for Non-Muslims", "nameEs": "Caridad para no musulmanes", "color": "#F8D7DA", "description": "البر والإحسان إلى غير المسلمين"},
    {"id": 17, "nameAr": "إعطاء الماء في يوم حار", "nameEn": "Provide Water on a Hot Day", "nameEs": "Dar agua en un día caluroso", "color": "#B8E6B8", "description": "سقي الماء في الأيام الحارة"},
    {"id": 18, "nameAr": "إعطاء الحليب واللحم", "nameEn": "Provide Milk and Meat", "nameEs": "Dar leche y carne", "color": "#FFD1DC", "description": "توزيع الحليب واللحم على المحتاجين"},
    {"id": 19, "nameAr": "دفع فاتورة الغاز", "nameEn": "Pay the Gas Bill", "nameEs": "Pagar la factura de gas", "color": "#E6E6FA", "description": "دفع فواتير الخدمات للمحتاجين"},
    {"id": 20, "nameAr": "دفع قرض شخص آخر", "nameEn": "Pay Someone's Loan", "nameEs": "Pagar la deuda de alguien", "color": "#F0E68C", "description": "قضاء الديون عن المدينين"},
    {"id": 21, "nameAr": "الدواء للمريض", "nameEn": "Medicine for the Sick", "nameEs": "Medicamento para el enfermo", "color": "#FFA07A", "description": "توفير الدواء والعلاج للمرضى"},
    {"id": 22, "nameAr": "الإنفاق في سبيل الله", "nameEn": "Spending in the Sake of Allah", "nameEs": "Gastar en el camino de Allah", "color": "#20B2AA", "description": "الإنفاق في جميع وجوه الخير"},
    {"id": 23, "nameAr": "مساعدة شخص", "nameEn": "Helping a Person", "nameEs": "Ayudar a una persona", "color": "#87CEEB", "description": "تقديم المساعدة للأشخاص المحتاجين"},
    {"id": 24, "nameAr": "إزالة الأذى من الطريق", "nameEn": "Removing Harmful Objects from the Road", "nameEs": "Eliminar objetos dañinos del camino", "color": "#DDA0DD", "description": "إزالة ما يؤذي الناس من الطريق"},
    {"id": 25, "nameAr": "زراعة النباتات من أجل البشر أو الطيور أو الحيوانات", "nameEn": "Growing Plants for Humans, Birds, or Animals", "nameEs": "Plantar plantas para humanos, aves o animales", "color": "#90EE90", "description": "زراعة ما ينفع الإنسان والحيوان"},
    {"id": 26, "nameAr": "كفالة يتيم", "nameEn": "Sponsoring an Orphan (Kafala Yateem)", "nameEs": "Patrocinar un huérfano", "color": "#FFB6C1", "description": "كفالة الأيتام ورعايتهم"},
    {"id": 27, "nameAr": "التصدق بشيء تحبه", "nameEn": "Charity with Something You Love", "nameEs": "Caridad con algo que te guste", "color": "#F0E68C", "description": "التصدق بأفضل ما تحب"},
    {"id": 28, "nameAr": "التصدق بالمال", "nameEn": "Charity with Money", "nameEs": "Caridad con dinero", "color": "#98FB98", "description": "الصدقة المالية المباشرة"},
    {"id": 29, "nameAr": "هدية لأخ مسلم أو أخت مسلمة", "nameEn": "Gift for a Muslim Brother or Sister", "nameEs": "Regalo para un hermano o hermana musulmana", "color": "#AFEEEE", "description": "تقديم الهدايا للإخوة المسلمين"},
    {"id": 30, "nameAr": "التصدق بقرآن", "nameEn": "Charity with the Quran", "nameEs": "Caridad con el Corán", "color": "#D8BFD8", "description": "توزيع المصاحف الشريفة"},
    {"id": 31, "nameAr": "التصدق بملابس أو حذاء", "nameEn": "Charity with Clothes or Shoes", "nameEs": "Caridad con ropa o zapatos", "color": "#F5DEB3", "description": "التصدق بالملابس والأحذية للمحتاجين"},
    {"id": 32, "nameAr": "دفع إيجار بيت أسرة مسلمة فقيرة", "nameEn": "Pay Rent for a Poor Muslim Family", "nameEs": "Pagar el alquiler de una familia musulmana pobre", "color": "#CD853F", "description": "دفع إيجار المنازل للأسر الفقيرة"},
]

# Azkar endpoints
@api_router.get("/azkar")
async def get_azkar_list():
    """Get the list of available azkar"""
    return {"azkar": AZKAR_LIST}

@api_router.post("/azkar/entry", response_model=ZikrEntry)
async def create_zikr_entry(entry: ZikrEntryCreate):
    """Record a zikr entry with user's device timestamp"""
    # Start with base edit_notes
    edit_notes = []
    
    # Add comment as first edit note if provided
    if entry.comment:
        edit_notes.append(entry.comment)
    
    zikr_obj = ZikrEntry(
        zikr_id=entry.zikr_id,
        count=entry.count,
        date=entry.date,
        timestamp=create_timestamp_from_client(entry.client_timestamp, entry.timezone),
        edit_notes=edit_notes
    )
    await db.zikr_entries.insert_one(zikr_obj.dict())
    return zikr_obj

@api_router.put("/azkar/entry/{entry_id}")
async def update_zikr_entry(entry_id: str, update_data: ZikrEntryUpdate):
    """Update a zikr entry"""
    try:
        # Get the existing entry
        existing_entry = await db.zikr_entries.find_one({"id": entry_id, "user_id": "default"})
        if not existing_entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        # Prepare update data
        update_dict = {"count": update_data.count}
        
        # Add edit note if provided
        if update_data.edit_note:
            edit_notes = existing_entry.get("edit_notes", [])
            # Use client timestamp or current time in user's timezone
            timestamp = create_timestamp_from_client(update_data.client_timestamp, update_data.timezone).isoformat()
            edit_note = f"{timestamp}: {update_data.edit_note}"
            edit_notes.append(edit_note)
            update_dict["edit_notes"] = edit_notes
        
        # Update the entry
        await db.zikr_entries.update_one(
            {"id": entry_id, "user_id": "default"}, 
            {"$set": update_dict}
        )
        
        # Return updated entry
        updated_entry = await db.zikr_entries.find_one({"id": entry_id, "user_id": "default"})
        if "_id" in updated_entry:
            updated_entry["_id"] = str(updated_entry["_id"])
            
        return {"success": True, "entry": updated_entry}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    
    # Convert ObjectId to string for JSON serialization
    for entry in entries:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    
    # Group by zikr_id and calculate totals
    daily_summary = {}
    total_daily = 0
    
    for entry in entries:
        zikr_id = entry["zikr_id"]
        count = entry["count"]
        
        if zikr_id not in daily_summary:
            daily_summary[zikr_id] = {
                "count": 0,
                "sessions": 0,
                "percentage": 0
            }
        
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

@api_router.get("/azkar/range/{start_date}/{end_date}")
async def get_azkar_range(start_date: str, end_date: str):
    """Get all azkar entries for a date range"""
    entries = await db.zikr_entries.find({
        "date": {"$gte": start_date, "$lte": end_date},
        "user_id": "default"
    }).to_list(1000)
    
    # Convert ObjectId to string for JSON serialization
    for entry in entries:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    
    # Group by zikr_id and calculate totals across the range
    range_summary = {}
    total_range = 0
    
    for entry in entries:
        zikr_id = entry["zikr_id"]
        count = entry["count"]
        
        if zikr_id not in range_summary:
            range_summary[zikr_id] = {
                "count": 0,
                "sessions": 0,
                "percentage": 0
            }
        
        range_summary[zikr_id]["count"] += count
        range_summary[zikr_id]["sessions"] += 1
        total_range += count
    
    # Calculate percentages
    for zikr_id in range_summary:
        if total_range > 0:
            range_summary[zikr_id]["percentage"] = round(
                (range_summary[zikr_id]["count"] / total_range) * 100, 1
            )
        else:
            range_summary[zikr_id]["percentage"] = 0
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_range": total_range,
        "azkar_summary": range_summary,
        "entries": entries
    }

# Charity endpoints
@api_router.get("/charities")
async def get_charity_list():
    """Get the list of available charities"""
    return {"charities": CHARITY_LIST}

@api_router.post("/charities/entry", response_model=CharityEntry)
async def create_charity_entry(entry: CharityEntryCreate):
    """Record a charity entry with user's device timestamp"""
    charity_obj = CharityEntry(
        charity_id=entry.charity_id,
        count=entry.count,
        date=entry.date,
        comments=entry.comments,
        timestamp=create_timestamp_from_client(entry.client_timestamp, entry.timezone)
    )
    await db.charity_entries.insert_one(charity_obj.dict())
    return charity_obj

@api_router.put("/charities/entry/{entry_id}")
async def update_charity_entry(entry_id: str, update_data: CharityEntryUpdate):
    """Update a charity entry"""
    try:
        # Get the existing entry
        existing_entry = await db.charity_entries.find_one({"id": entry_id, "user_id": "default"})
        if not existing_entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        
        # Prepare update data
        update_dict = {"count": update_data.count}
        
        if update_data.comments is not None:
            update_dict["comments"] = update_data.comments
        
        # Add edit note if provided
        if update_data.edit_note:
            edit_notes = existing_entry.get("edit_notes", [])
            # Use client timestamp or current time in user's timezone
            timestamp = create_timestamp_from_client(update_data.client_timestamp, update_data.timezone).isoformat()
            edit_note = f"{timestamp}: {update_data.edit_note}"
            edit_notes.append(edit_note)
            update_dict["edit_notes"] = edit_notes
        
        # Update the entry
        await db.charity_entries.update_one(
            {"id": entry_id, "user_id": "default"}, 
            {"$set": update_dict}
        )
        
        # Return updated entry
        updated_entry = await db.charity_entries.find_one({"id": entry_id, "user_id": "default"})
        if "_id" in updated_entry:
            updated_entry["_id"] = str(updated_entry["_id"])
            
        return {"success": True, "entry": updated_entry}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/charities/{charity_id}/history")
async def get_charity_history(charity_id: int, days: Optional[int] = Query(30, description="Number of days to retrieve")):
    """Get history for a specific charity"""
    entries = await db.charity_entries.find(
        {"charity_id": charity_id, "user_id": "default"}
    ).sort("timestamp", -1).limit(days).to_list(days)
    
    # Convert ObjectId to string for JSON serialization
    for entry in entries:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    
    return {"entries": entries}

@api_router.get("/charities/{charity_id}/stats", response_model=CharityStats)
async def get_charity_stats(charity_id: int):
    """Get statistics for a specific charity"""
    pipeline = [
        {"$match": {"charity_id": charity_id, "user_id": "default"}},
        {"$group": {
            "_id": None,
            "total_count": {"$sum": "$count"},
            "total_sessions": {"$sum": 1},
            "last_entry": {"$max": "$timestamp"}
        }}
    ]
    
    result = await db.charity_entries.aggregate(pipeline).to_list(1)
    
    if result:
        stats_data = result[0]
        return CharityStats(
            charity_id=charity_id,
            total_count=stats_data.get("total_count", 0),
            total_sessions=stats_data.get("total_sessions", 0),
            last_entry=stats_data.get("last_entry")
        )
    else:
        return CharityStats(
            charity_id=charity_id,
            total_count=0,
            total_sessions=0,
            last_entry=None
        )

@api_router.get("/charities/daily/{date}")
async def get_daily_charities(date: str):
    """Get all charity entries for a specific date"""
    entries = await db.charity_entries.find(
        {"date": date, "user_id": "default"}
    ).to_list(100)
    
    # Convert ObjectId to string for JSON serialization
    for entry in entries:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    
    # Group by charity_id and calculate totals
    daily_summary = {}
    total_daily = 0
    
    for entry in entries:
        charity_id = entry["charity_id"]
        count = entry["count"]
        
        if charity_id not in daily_summary:
            daily_summary[charity_id] = {
                "count": 0,
                "sessions": 0,
                "percentage": 0
            }
        
        daily_summary[charity_id]["count"] += count
        daily_summary[charity_id]["sessions"] += 1
        total_daily += count
    
    # Calculate percentages
    for charity_id in daily_summary:
        if total_daily > 0:
            daily_summary[charity_id]["percentage"] = round(
                (daily_summary[charity_id]["count"] / total_daily) * 100, 1
            )
        else:
            daily_summary[charity_id]["percentage"] = 0
    
    return {
        "date": date,
        "total_daily": total_daily,
        "charity_summary": daily_summary,
        "entries": entries
    }

@api_router.get("/charities/range/{start_date}/{end_date}")
async def get_charities_range(start_date: str, end_date: str):
    """Get all charity entries for a date range"""
    entries = await db.charity_entries.find({
        "date": {"$gte": start_date, "$lte": end_date},
        "user_id": "default"
    }).to_list(1000)
    
    # Convert ObjectId to string for JSON serialization
    for entry in entries:
        if "_id" in entry:
            entry["_id"] = str(entry["_id"])
    
    # Group by charity_id and calculate totals across the range
    range_summary = {}
    total_range = 0
    
    for entry in entries:
        charity_id = entry["charity_id"]
        count = entry["count"]
        
        if charity_id not in range_summary:
            range_summary[charity_id] = {
                "count": 0,
                "sessions": 0,
                "percentage": 0
            }
        
        range_summary[charity_id]["count"] += count
        range_summary[charity_id]["sessions"] += 1
        total_range += count
    
    # Calculate percentages
    for charity_id in range_summary:
        if total_range > 0:
            range_summary[charity_id]["percentage"] = round(
                (range_summary[charity_id]["count"] / total_range) * 100, 1
            )
        else:
            range_summary[charity_id]["percentage"] = 0
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_range": total_range,
        "charity_summary": range_summary,
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