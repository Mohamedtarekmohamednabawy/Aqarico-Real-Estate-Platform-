"""
Aqarico AI Chatbot Microservice
FastAPI service that provides an AI real estate consultant for Alexandria, Egypt.
Uses Google Gemini AI with XGBoost price prediction and MongoDB property search.

Run: uvicorn main:app --reload --port 8001
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from google.genai.types import (
    Tool, FunctionDeclaration, Schema, Type,
    AutomaticFunctionCallingConfig,
)
import difflib
import pandas as pd
import joblib
import numpy as np
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import certifi
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re

load_dotenv()

# ==========================================
# 1. Server setup, model & database loading
# ==========================================
app = FastAPI(title="Aqarico AI Chatbot")

FRONTEND_URLS = os.getenv("FRONTEND_URL", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[url.strip() for url in FRONTEND_URLS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

try:
    model = joblib.load(os.path.join(MODEL_DIR, "xgboost_real_estate_model.pkl"))
    encoder = joblib.load(os.path.join(MODEL_DIR, "data_encoder.pkl"))
    print("[OK] XGBoost model and encoder loaded successfully")
except Exception as e:
    print(f"[ERROR] Error loading model files: {e}")
    model = None
    encoder = None

MONGODB_URI = os.getenv("MONGODB_URI", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

mongo_client = None
properties_collection = None
db = None

try:
    mongo_client = MongoClient(MONGODB_URI, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True)
    try:
        db = mongo_client.get_default_database()
    except:
        db_names = mongo_client.list_database_names()
        user_dbs = [d for d in db_names if d not in ['admin', 'local', 'config']]
        target_db = user_dbs[0] if user_dbs else 'test'
        db = mongo_client[target_db]
        print(f"[INFO] Using database: {target_db}")

    properties_collection = db["properties"]
    count = properties_collection.count_documents({})
    print(f"[OK] MongoDB connected — {count} properties in database from '{db.name}'")
except Exception as e:
    print(f"[ERROR] MongoDB connection error: {e}")

# ==========================================
# 2. Gemini API keys & Models (fallback system)
# ==========================================
API_KEYS = [k for k in [
    os.getenv("GEMINI_API_KEY_1"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
    os.getenv("GEMINI_API_KEY_5"),
    os.getenv("GEMINI_API_KEY_6"),
    os.getenv("GEMINI_API_KEY_7"),
    os.getenv("GEMINI_API_KEY_8"),
    os.getenv("GEMINI_API_KEY_9"),
    os.getenv("GEMINI_API_KEY_10"),
] if k]

# List of stable models to use, in order of preference.
# If a 503 (model overloaded) error occurs, we cycle to the next model.
STABLE_MODELS = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-pro'
]

current_key_index = 0
current_model_index = 0
genai_client = genai.Client(api_key=API_KEYS[current_key_index])

# ==========================================
# 3. Arabic-English translator
# ==========================================
LOCATION_MAP = {
    # ── Districts (Arabic variants → English) ──────────────────────────────
    "العجمي": "El Agami", "عجمي": "El Agami",
    "العامريه": "El Amreya", "العامرية": "El Amreya", "عامرية": "El Amreya", "عامريه": "El Amreya",
    "الجمرك": "El Gomrok", "جمرك": "El Gomrok",
    "المنتزه": "El Montazah", "منتزه": "El Montazah",
    "غرب": "Gharb",
    "شرق": "Sharq",
    "وسط": "Wasat",

    # ── El Agami locations ─────────────────────────────────────────────────
    "ابو يوسف": "Abu Youssef", "أبو يوسف": "Abu Youssef", "أبو يوسص": "Abu Youssef",
    "البيطاش": "El Bitash", "البيطش": "El Bitash",
    "الدخيله": "El Dekhila", "الدخيلة": "El Dekhila",
    "الهانوفيل": "El Hanouvel", "هانوفيل": "El Hanouvel",
    "الكيلو 21": "Kilo 21", "كيلو 21": "Kilo 21", "كيلو٢١": "Kilo 21",

    # ── El Amreya locations ────────────────────────────────────────────────
    "كينج مريوط": "King Mariout", "كينق مريوط": "King Mariout",
    "ابو تلات": "Abu Talat", "أبو تلات": "Abu Talat",
    # El Amreya as location (same name as district) — handled in AMBIGUOUS_NAMES

    # ── El Gomrok locations ────────────────────────────────────────────────
    "بحري": "Bahary", "بحرى": "Bahary",
    "المنشيه": "Mansheya", "المنشية": "Mansheya", "منشية": "Mansheya", "منشيه": "Mansheya",
    "راس التين": "Ras Al Tin", "رأس التين": "Ras Al Tin",

    # ── El Montazah locations ──────────────────────────────────────────────
    "ابو قير": "Abo Qir", "أبو قير": "Abo Qir",
    "العصافره": "El Asafra", "العصافرة": "El Asafra",
    "العوايد": "El Awayed", "العوايده": "El Awayed",
    "المعموره": "El Mamoura", "المعمورة": "El Mamoura",
    "المندره": "El Mandara", "المندرة": "El Mandara",
    # El Montazah as location — handled in AMBIGUOUS_NAMES
    "السيوف": "El Seyouf",
    "ميامي": "Miami",
    "سيدي بشر": "Sidi Bishr",

    # ── Gharb locations ────────────────────────────────────────────────────
    "المكس": "El Max",
    "القباري": "El Qabari",
    "الورديان": "El Wardiyan",
    "مينا البصل": "Mina El Basal",

    # ── Sharq locations ────────────────────────────────────────────────────
    "بولكلي": "Bolekly", "بولكلى": "Bolekly",
    "كليوباترا": "Cleopatra",
    "الساعه": "El Saa'ah Sq", "الساعة": "El Saa'ah Sq", "ميدان الساعه": "El Saa'ah Sq",
    "فلمينج": "Fleming",
    "جناكليس": "Ganaklis",
    "جليم": "Glim",
    "كفر عبده": "Kafr Abdo",
    "لوران": "Lauran",
    "رشدي": "Roshdy", "رشدى": "Roshdy",
    "سابا باشا": "Saba Basha",
    "سان ستيفانو": "San Stefano",
    "سيدي جابر": "Sidi Gaber",
    "سموحه": "Smouha", "سموحة": "Smouha",
    "سبورتنج": "Sporting",
    "ستانلي": "Stanley", "ستانلى": "Stanley",
    "فيكتوريا": "Victorya", "فيكتوريه": "Victorya",
    "زيزينيا": "Zezenia", "زيزينيه": "Zezenia",

    # ── Wasat locations ────────────────────────────────────────────────────
    "باكوس": "Bakoos",
    "كامب شيزار": "Camp Cesar",
    "الشاطبي": "El Chatby", "الشاطبى": "El Chatby",
    "الحضرة": "El Hadara", "الحضره": "El Hadara",
    "الابراهيميه": "Ibrahimia", "الإبراهيمية": "Ibrahimia", "ابراهيمية": "Ibrahimia",
    "محطه الرمل": "Mahta El Raml", "محطة الرمل": "Mahta El Raml",
    "محرم بك": "Moharram Bek",

    # ── Finish levels ──────────────────────────────────────────────────────
    "نص تشطيب": "Semi Finished", "على المحاره": "Semi Finished", "نصف تشطيب": "Semi Finished",
    "سوبر لوكس": "Super Lux",
    "لوكس": "Lux",
    "طوب احمر": "Without Finish", "بدون تشطيب": "Without Finish", "عضم": "Without Finish", "كاسكو": "Without Finish",
    "الترا سوبر لوكس": "Extra Super Lux", "ألترا سوبر لوكس": "Extra Super Lux",

    # ── English passthrough variants ──────────────────────────────────────
    "Abu Qir": "Abo Qir", "Abo Qir": "Abo Qir",
    "El Hanofel": "El Hanouvel", "El Hanoville": "El Hanouvel", "El Hanouvel": "El Hanouvel",
    "El Montazah": "El Montazah", "El Agami": "El Agami", "Sharq": "Sharq",
    "Smouha": "Smouha", "Miami": "Miami", "Lauran": "Lauran", "Glim": "Glim",
    "El Amreya": "El Amreya", "El Gomrok": "El Gomrok", "Gharb": "Gharb", "Wasat": "Wasat",
}
REVERSE_MAP = {v: k for k, v in LOCATION_MAP.items()}
REVERSE_MAP.update({
    "ابو يوسف": "Abu Youssef", "أبو يوسف": "Abu Youssef", "أبويوسف": "Abu Youssef", "ابويوسف": "Abu Youssef",
    "El Hanouvel": "El Hanouvel", "الهانوفيل": "El Hanouvel", "الهانوفيل ": "El Hanouvel",
    "Abo Qir": "أبو قير", "El Hanouvel": "الهانوفيل", "El Montazah": "المنتزه",
    "El Agami": "العجمي", "Sharq": "شرق", "Smouha": "سموحة",
    "Miami": "ميامي", "Lauran": "لوران", "Glim": "جليم",
})

# Names that exist as BOTH a district and a location — resolved by category.
# Rule: if user says the name WITHOUT a specific sub-area → use district (whole area).
# Rule: if user says "منطقة X تحديداً" or clearly means the sub-area → use location.
AMBIGUOUS_NAMES = {
    # El Montazah
    "el montazah":  {"district": "El Montazah", "location": "El Montazah"},
    "المنتزه":      {"district": "El Montazah", "location": "El Montazah"},
    "منتزه":        {"district": "El Montazah", "location": "El Montazah"},
    # El Amreya
    "el amreya":    {"district": "El Amreya",   "location": "El Amreya"},
    "العامرية":     {"district": "El Amreya",   "location": "El Amreya"},
    "العامريه":     {"district": "El Amreya",   "location": "El Amreya"},
    "عامرية":       {"district": "El Amreya",   "location": "El Amreya"},
    "عامريه":       {"district": "El Amreya",   "location": "El Amreya"},
    # El Agami (the district contains Abu Youssef etc., but El Agami itself is sometimes used as a location too)
    "el agami":     {"district": "El Agami",    "location": "El Agami"},
    "العجمي":       {"district": "El Agami",    "location": "El Agami"},
    "عجمي":         {"district": "El Agami",    "location": "El Agami"},
}

VALID_LOCATIONS = []
VALID_DISTRICTS = []

def refresh_valid_names():
    global VALID_LOCATIONS, VALID_DISTRICTS
    if properties_collection is not None:
        try:
            VALID_LOCATIONS = sorted(properties_collection.distinct("location"))
            VALID_DISTRICTS = sorted(properties_collection.distinct("district"))
            print(f"[OK] {len(VALID_LOCATIONS)} locations, {len(VALID_DISTRICTS)} districts fetched")
            return len(VALID_LOCATIONS) > 0
        except Exception as e:
            print(f"[ERROR] Could not fetch names: {e}")
            return False
    return False

refresh_valid_names()


def translate_to_model_terms(text, category=None):
    if not text: return ""
    text_stripped = text.strip()
    normalized = text_stripped.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه")

    ambiguous_key = text_stripped.lower()
    if ambiguous_key in AMBIGUOUS_NAMES and category in ("location", "district"):
        resolved = AMBIGUOUS_NAMES[ambiguous_key][category]
        print(f"[DEBUG] Ambiguous name '{text_stripped}' resolved as {category} → '{resolved}'")
        return resolved
    normalized_key = normalized.lower()
    if normalized_key in AMBIGUOUS_NAMES and category in ("location", "district"):
        resolved = AMBIGUOUS_NAMES[normalized_key][category]
        print(f"[DEBUG] Ambiguous name '{text_stripped}' (normalized) resolved as {category} → '{resolved}'")
        return resolved

    if normalized in LOCATION_MAP:
        return LOCATION_MAP[normalized]
    for k, v in LOCATION_MAP.items():
        if k.lower() == text_stripped.lower():
            return v

    if not VALID_LOCATIONS or not VALID_DISTRICTS:
        refresh_valid_names()

    if category == "district" and VALID_DISTRICTS:
        m = difflib.get_close_matches(text_stripped, VALID_DISTRICTS, n=1, cutoff=0.7) or \
            difflib.get_close_matches(text_stripped.title(), VALID_DISTRICTS, n=1, cutoff=0.7)
        if m: return m[0]

    if category == "location" and VALID_LOCATIONS:
        if text_stripped in VALID_LOCATIONS: return text_stripped
        m = difflib.get_close_matches(text_stripped, VALID_LOCATIONS, n=1, cutoff=0.7) or \
            difflib.get_close_matches(text_stripped.title(), VALID_LOCATIONS, n=1, cutoff=0.7)
        if m: return m[0]

    arabic_keys = [k for k in LOCATION_MAP if any(ord(c) > 127 for c in k)]
    m = difflib.get_close_matches(normalized, arabic_keys, n=1, cutoff=0.6)
    if m: return LOCATION_MAP[m[0]]

    return text_stripped


def translate_to_arabic(text):
    if not text: return "غير محدد"
    return REVERSE_MAP.get(text, text)


# ==========================================
# 4. Name resolver
# ==========================================
NAME_VARIANTS = {
    "محمد":   ["Mohamed", "Mohammed", "Muhammad", "Muhammed", "Mohamad", "Mahamed"],
    "محمود":  ["Mahmoud", "Mahmood", "Mahmod"],
    "أحمد":   ["Ahmed", "Ahmad", "Ahamed"],
    "احمد":   ["Ahmed", "Ahmad", "Ahamed"],
    "علي":    ["Ali", "Aly"],
    "إبراهيم":["Ibrahim", "Ebrahim", "Ibrahem"],
    "ابراهيم":["Ibrahim", "Ebrahim", "Ibrahem"],
    "مصطفى": ["Mostafa", "Mustafa"],
    "ياسر":   ["Yasser", "Yasir", "Yaser"],
    "كمال":   ["Kamal", "Kamel"],
    "خالد":   ["Khaled", "Khalid"],
    "زكي":    ["Zaki", "Zaky", "Zake", "Zeki"],
    "زكى":    ["Zaki", "Zaky", "Zake", "Zeki"],
    "سمير":   ["Samir", "Samer"],
    "هاني":   ["Hany", "Hani"],
    "هانى":   ["Hany", "Hani"],
    "رامي":   ["Ramy", "Rami"],
    "رامى":   ["Ramy", "Rami"],
    "منصور":  ["Mansour", "Mansoor"],
    "حسين":   ["Hussein", "Hussien", "Hosein"],
    "طارق":   ["Tarek", "Tarik", "Tariq"],
    "سعيد":   ["Said", "Saeed", "Saied"],
    "عادل":   ["Adel", "Adil"],
    "مجدي":   ["Magdy", "Magdi"],
    "مجدى":   ["Magdy", "Magdi"],
    "عمرو":   ["Amr", "Omar", "Amro"],
    "حسن":    ["Hassan", "Hasan"],
    "عمر":    ["Omar", "Omer"],
    "وليد":   ["Walid", "Waleed"],
    "أشرف":   ["Ashraf"],
    "اشرف":   ["Ashraf"],
    "كريم":   ["Karim", "Kareem"],
    "تامر":   ["Tamer", "Tamir"],
    "شريف":   ["Sherif", "Sharif"],
    "ماجد":   ["Maged", "Majed"],
    "نادر":   ["Nader", "Nadir"],
    "إسلام":  ["Islam", "Eslam"],
    "اسلام":  ["Islam", "Eslam"],
    "يوسف":   ["Yousef", "Youssef", "Yusef"],
    "عصام":   ["Essam", "Esam"],
    "نبيل":   ["Nabil", "Nabeel"],
    "فادي":   ["Fady", "Fadi"],
    "رضا":    ["Rida", "Reda"],
    "سيد":    ["Sayed", "Sied", "Sayyed"],
    "السيد":  ["El Sayed", "Al Sayed"],
}

def normalize_ar(text: str) -> str:
    return text.replace("أ","ا").replace("إ","ا").replace("آ","ا").replace("ة","ه").replace("ى","ي")

def get_name_variants(name: str) -> list[str]:
    words = name.strip().split()
    is_arabic = any(ord(c) > 127 for c in name)
    if not is_arabic:
        return [name]
    word_options = []
    for w in words:
        nw = normalize_ar(w)
        found = False
        for ar_key, en_list in NAME_VARIANTS.items():
            if normalize_ar(ar_key) == nw:
                word_options.append(en_list)
                found = True
                break
        if not found:
            word_options.append([w])
    from itertools import product
    combos = list(product(*word_options))[:20]
    return [" ".join(c) for c in combos]

def build_arabic_flex_regex(name: str) -> re.Pattern:
    escaped = re.escape(name)
    flex = re.sub(r'[اأإآ]', '[اأإآ]', escaped)
    flex = re.sub(r'[يى]',   '[يى]',   flex)
    flex = re.sub(r'[هة]',   '[هة]',   flex)
    flex = re.sub(r'[زذ]',   '[زذ]',   flex)
    return re.compile(flex, re.IGNORECASE)

def resolve_owner(name: str) -> tuple[list, str | None]:
    print(f"[DEBUG] resolve_owner called with name: '{name}'")
    if db is None:
        print("[DEBUG] DB is None in resolve_owner")
        return [], "قاعدة البيانات مش متاحة دلوقتي."

    is_arabic = any(ord(c) > 127 for c in name)
    variants  = get_name_variants(name)
    print(f"[DEBUG] [Owner] Variants: {variants}")

    or_clauses = []
    if is_arabic:
        ar_regex = build_arabic_flex_regex(name)
        or_clauses += [{"firstName": ar_regex}, {"lastName": ar_regex}, {"username": ar_regex}]
    for v in variants:
        or_clauses += [
            {"firstName": {"$regex": re.escape(v), "$options": "i"}},
            {"lastName":  {"$regex": re.escape(v), "$options": "i"}},
        ]

    users  = list(db["users"].find({"$or": or_clauses}, {"firstName":1,"lastName":1,"username":1,"_id":1}))
    agents = []
    try:
        ag_clauses = []
        if is_arabic:
            ar_regex = build_arabic_flex_regex(name)
            ag_clauses += [{"name": ar_regex}, {"companyName": ar_regex}]
        for v in variants:
            ag_clauses += [
                {"name":        {"$regex": re.escape(v), "$options": "i"}},
                {"companyName": {"$regex": re.escape(v), "$options": "i"}},
            ]
        agents = list(db["agents"].find({"$or": ag_clauses}, {"name":1,"companyName":1,"_id":1}))
    except Exception:
        pass

    all_matches = {}
    for u in users:
        fn = f"{u.get('firstName','')} {u.get('lastName','')}".strip() or u.get("username","")
        all_matches[fn] = u["_id"]
    for a in agents:
        fn = a.get("name") or a.get("companyName") or ""
        all_matches[fn] = a["_id"]

    print(f"  [Owner] Matches: {list(all_matches.keys())}")

    name_lower = name.lower()
    for cname, cid in all_matches.items():
        if cname.lower() == name_lower or any(cname.lower() == v.lower() for v in variants):
            print(f"  [Owner] Exact: '{cname}'")
            return [cid], None

    if len(all_matches) > 1:
        names_list = "\n".join([f"- {n}" for n in sorted(all_matches.keys())])
        return [], f"لقيت {len(all_matches)} أشخاص بيجوا قريبين من الاسم ده، قولي قصدك على مين بالظبط:\n\n{names_list}"

    if len(all_matches) == 1:
        return [list(all_matches.values())[0]], None

    print("  [Owner] Fuzzy fallback (cutoff=0.60)...")
    pool = {}
    for u in db["users"].find({}, {"firstName":1,"lastName":1,"username":1}):
        fn = f"{u.get('firstName','')} {u.get('lastName','')}".strip() or u.get("username","")
        pool[fn] = u["_id"]
    try:
        for a in db["agents"].find({}, {"name":1,"companyName":1}):
            fn = a.get("name") or a.get("companyName") or ""
            pool[fn] = a["_id"]
    except Exception:
        pass

    best = []
    for v in [name] + variants:
        for c in difflib.get_close_matches(v, list(pool.keys()), n=5, cutoff=0.60):
            if c not in best: best.append(c)

    print(f"  [Owner] Fuzzy candidates: {best}")
    if not best:
        return [], f"مش لاقي حد بالاسم ده: {name}"
    if len(best) == 1:
        return [pool[best[0]]], None

    names_list = "\n".join([f"- {n}" for n in best])
    return [], f"ملقيتش الاسم ده بالظبط، بس لقيت أسامي قريبة. قصدك على مين؟:\n\n{names_list}"


# ==========================================
# 5. Search intent detector
# ==========================================
SEARCH_INTENT_KEYWORDS = [
    # Arabic
    "شقق", "شقة", "عقار", "عقارات", "فيلا", "فيلات", "دوبليكس", "بنتهاوس",
    "بدور", "بدورين", "ايجار", "إيجار", "للايجار", "للإيجار",
    "للبيع", "اشتري", "أشتري", "عايز شقة", "عايز أشتري", "عايز أجار",
    "فين شقق", "ارخص", "أرخص", "أغلى", "اغلى", "أحسن", "احسن",
    "احدث", "أحدث", "متاح", "متاحة", "موجود", "موجودة",
    "عندك", "عندكم", "ايه المتاح", "إيه المتاح", "ايه عندك",
    "هاتلي", "هاتلي شقق", "دور لي", "دورلي", "لقيلي",
    "سعر", "بميزانية", "بميزانيه", "معايا", "ميزانيتي", "الف", "ألف", "مليون",
    "غرف", "غرفة", "أوضة", "أوض", "حمام", "حمامات",
    "متر", "مساحة", "مساحه", "دور", "تايه", "لقطة", "لقطه",
    "تانية", "تانية", "غيرها", "تاني", "كمان", "تاني",
    # English
    "apartment", "flat", "villa", "duplex", "rent", "buy", "sale",
    "available", "cheapest", "most expensive", "newest", "find me",
    "show me", "list", "properties", "property", "anything else", "more",
    "بناء على", "زي ما قلنا", "اللي فات", "نفس المواصفات", "بناءً على", "كلامنا",
]

# Keywords that indicate a compare-only request (refers to already-shown results)
COMPARE_ONLY_KEYWORDS = [
    "قارن", "قارنهم", "قارنهن", "مقارنة", "قارن بين",
    "compare", "compare these", "compare them", "compare last",
    "حطهم", "حطهم ف تول", "حطهم في تول",
]

PREDICT_INTENT_KEYWORDS = [
    "توقع", "توقيع", "قيم", "تقييم", "تثمين", "تمن", "بكام", "تسوى", "تسوي",
    "يسوى", "يسوي", "سعرها", "سعرها كام", "سعرها كام", "كم السعر",
    "predict", "worth", "estimate", "valuation", "appraise", "appraisal"
]

def has_search_intent(message: str) -> bool:
    msg_lower = message.lower().strip()
    # Predict intent → never treat as search
    if any(kw in msg_lower for kw in PREDICT_INTENT_KEYWORDS):
        return False
    # Pure compare intent (referring to already-shown results) → no forced search needed
    has_compare = any(kw in msg_lower for kw in COMPARE_ONLY_KEYWORDS)
    has_real_search = any(kw in msg_lower for kw in SEARCH_INTENT_KEYWORDS)
    if has_compare and not has_real_search:
        return False  # Pure compare → use normal model, no forced search
    return has_real_search


# ==========================================
# 6. Tools (Python implementations)
# ==========================================

def predict_property_price(area: float, bedrooms: int, bathrooms: int, location: str, district: str, year_built: int, finish: str, floor: int) -> str:
    """Predict the market price of a property using the XGBoost model."""
    print(f"[DEBUG] predict_property_price called with: area={area}, bedrooms={bedrooms}, bathrooms={bathrooms}, location={location}, district={district}")
    try:
        en_location = translate_to_model_terms(location, category="location")
        en_district = translate_to_model_terms(district, category="district")
        en_finish   = translate_to_model_terms(finish)

        print(f"\n[DEBUG] XGBOOST Input: {en_district}/{en_location} | {area}m² | {bedrooms}b/{bathrooms}ba | {en_finish} | floor {floor} | {year_built}")

        property_data = {
            'Area': area, 'Bedrooms': bedrooms, 'Bathrooms': bathrooms,
            'Location': en_location, 'District': en_district, 'Year Built': year_built,
            'Finish': en_finish, 'Floor': floor,
            'Furnished': 0, 'Electricity Meter': 1, 'Natural Gas': 1,
            'Water Meter': 1, 'Elevator': 1 if floor > 4 else 0, 'Pool': 0, 'Security': 0
        }
        input_df      = pd.DataFrame([property_data])
        input_encoded = pd.DataFrame(encoder.transform(input_df), columns=encoder.get_feature_names_out())
        pred_log      = model.predict(input_encoded)
        prediction = str(np.expm1(pred_log)[0])
        print(f"[DEBUG] XGBOOST Result: {prediction}")
        return prediction
    except Exception as e:
        print(f"[DEBUG] Predict Tool Error: {e}")
        return "ERROR_PREDICTION_FAILED"


def compare_properties(property_ids: list[str]) -> str:
    """Activate the VISUAL comparison widget for 2–4 properties ONLY."""
    print(f"[DEBUG] compare_properties called with {len(property_ids)} IDs: {property_ids}")

    num = len(property_ids)
    if num < 2:
        return "ERROR: At least 2 properties are required for the visual tool."

    if num > 4:
        return "ERROR: 5+ properties detected — you MUST NOT call this tool. Do in-chat analysis ONLY."

    print(f"[DEBUG] Comparison valid. Returning signal for {num} properties.")
    return f"ACTION_COMPARE_READY:{','.join(property_ids)}"


def get_database_metadata() -> str:
    """Get metadata about the database: unique locations, districts, total properties and users."""
    print("[DEBUG] get_database_metadata called")
    locs  = ", ".join(VALID_LOCATIONS)  if VALID_LOCATIONS  else "None"
    dists = ", ".join(VALID_DISTRICTS) if VALID_DISTRICTS else "None"
    total_props = properties_collection.count_documents({"status": "available"}) if properties_collection else 0
    total_users = db["users"].count_documents({}) if db else 0
    return f"Total Available Properties: {total_props}\nTotal Users: {total_users}\n\nLocations:\n{locs}\n\nDistricts:\n{dists}"


def search_properties(
    min_price: float = 0, max_price: float = 0,
    min_area: float = 0, max_area: float = 0,
    locations: list[str] = None, districts: list[str] = None,
    finishes: list[str] = None, amenities: list[str] = None,
    min_year_built: int = 0, max_year_built: int = 0,
    min_floor: int = 0, max_floor: int = 0,
    min_views: int = 0, max_views: int = 0,
    is_featured: bool = None, is_verified: bool = None,
    owner_agent_name: str = None,
    sort_by: str = "price_asc", num_results: int = 5
) -> str:
    """Search for available properties in the database."""
    try:
        print(f"\n[DEBUG] search_properties called")
        num_results = int(num_results)
        print(f"[DEBUG] PARAMS | price:{min_price}-{max_price} | area:{min_area}-{max_area} | locs:{locations} | dists:{districts} | owner:{owner_agent_name}")

        if properties_collection is None:
            return "للأسف مش قادر أوصل لقاعدة البيانات دلوقتي."

        query = {"status": "available"}

        if min_price > 100 or max_price > 100:
            query["price"] = {}
            if min_price > 100: query["price"]["$gte"] = min_price
            if max_price > 100: query["price"]["$lte"] = max_price

        if min_area > 0 or max_area > 0:
            query["area"] = {}
            if min_area > 0: query["area"]["$gte"] = min_area
            if max_area > 0: query["area"]["$lte"] = max_area

        if locations:
            parsed = [translate_to_model_terms(l, "location") for l in locations if l]
            parsed = [l for l in parsed if l]
            if parsed:
                query["location"] = {"$in": [re.compile(f"^{re.escape(l)}$", re.IGNORECASE) for l in parsed]}

        if districts:
            parsed = [translate_to_model_terms(d, "district") for d in districts if d]
            parsed = [d for d in parsed if d]
            if parsed:
                query["district"] = {"$in": [re.compile(f"^{re.escape(d)}$", re.IGNORECASE) for d in parsed]}

        if finishes:
            parsed = [translate_to_model_terms(f) for f in finishes if f]
            parsed = [f for f in parsed if f]
            if parsed:
                query["finish"] = {"$in": [re.compile(f"^{re.escape(f)}$", re.IGNORECASE) for f in parsed]}

        if amenities:
            am_q = []
            for am in amenities:
                lo = am.lower()
                if "furnish"  in lo: am_q.append({"furnished": 1})
                elif "electric" in lo: am_q.append({"electricityMeter": 1})
                elif "gas"    in lo: am_q.append({"naturalGas": 1})
                elif "water"  in lo: am_q.append({"waterMeter": 1})
                elif "elevat" in lo: am_q.append({"elevator": 1})
                elif "secur"  in lo: am_q.append({"security": 1})
                else: am_q.append({"amenities": {"$regex": am, "$options": "i"}})
            if am_q: query["$and"] = am_q

        if min_year_built > 0 or max_year_built > 0:
            query["yearBuilt"] = {}
            if min_year_built > 0: query["yearBuilt"]["$gte"] = min_year_built
            if max_year_built > 0: query["yearBuilt"]["$lte"] = max_year_built

        if min_floor > 0 or max_floor > 0:
            query["floor"] = {}
            if min_floor > 0: query["floor"]["$gte"] = min_floor
            if max_floor > 0: query["floor"]["$lte"] = max_floor

        if min_views > 0 or max_views > 0:
            query["views"] = {}
            if min_views > 0: query["views"]["$gte"] = min_views
            if max_views > 0: query["views"]["$lte"] = max_views

        if is_featured is not None: query["isFeatured"] = is_featured
        if is_verified is not None: query["isVerified"] = is_verified

        if owner_agent_name:
            ids, error = resolve_owner(owner_agent_name)
            if error:
                return error
            query["$or"] = [{"owner": {"$in": ids}}, {"agent": {"$in": ids}}]

        sort_q = [("price", 1)]
        if sort_by == "price_desc": sort_q = [("price", -1)]
        elif sort_by == "newest":   sort_q = [("_id", -1)]

        results = list(properties_collection.find(query).sort(sort_q).limit(num_results))
        print(f"[DEBUG] Found {len(results)} results")

        if not results:
            return "NO_PROPERTIES_FOUND"

        results_list = []
        for p in results:
            results_list.append({
                "id": str(p['_id']),
                "area": p.get('area'),
                "district": p.get('district'),
                "location": p.get('location'),
                "floor": p.get('floor'),
                "finish": p.get('finish'),
                "price": p.get('price'),
                "link": f"{FRONTEND_URL}/property/{p['_id']}"
            })

        print(f"[DEBUG] Returning {len(results_list)} structured results")
        return str(results_list)

    except Exception as e:
        print(f"[ERROR] Search Tool Error: {e}")
        return "ERROR_SEARCH_FAILED"


# ==========================================
# 7. Gemini chat setup
# ==========================================
SYSTEM_PROMPT = """
{lang_rule}

أنت مستشار عقاري ذكي واجتماعي في الإسكندرية، اسمك "الخبير". شخصيتك تلقائية جداً، بتتكلم عامية مصرية طبيعية، روحك حلوة و"صنايعي" فاهم السوق.
ممنوع نهائياً استخدام أسطمبات محفوظة (مثل: بناءً على المعطيات، نصيحة سريعة، السعر العادل هو) أو استخدام الوجوه التعبيرية.
كل مرة ترد بطريقة مختلفة. ممنوع أن ترد برقم فقط أو رد مختصر — ردك دائماً دردشة طبيعية.

🏠 خريطة توزيع المناطق والأحياء — يجب حفظها والتزام بها حرفياً عند استدعاء الأدوات:

حي العجمي (district=El Agami):
  الهانوفيل→El Hanouvel | البيطاش→El Bitash | أبو يوسف→Abu Youssef | الدخيلة→El Dekhila | كيلو 21→Kilo 21

حي العامرية (district=El Amreya):
  أبو تلات→Abu Talat | كينج مريوط→King Mariout | العامرية (كموقع)→El Amreya

حي الجمرك (district=El Gomrok):
  بحري→Bahary | المنشية→Mansheya | رأس التين→Ras Al Tin

حي المنتزه (district=El Montazah):
  أبو قير→Abo Qir | العصافرة→El Asafra | العوايد→El Awayed | المعمورة→El Mamoura | المندرة→El Mandara | المنتزه (كموقع)→El Montazah | السيوف→El Seyouf | ميامي→Miami | سيدي بشر→Sidi Bishr

حي غرب (district=Gharb):
  المكس→El Max | القباري→El Qabari | الورديان→El Wardiyan | مينا البصل→Mina El Basal

حي شرق (district=Sharq):
  بولكلي→Bolekly | كليوباترا→Cleopatra | ميدان الساعة→El Saa'ah Sq | فلمينج→Fleming | جناكليس→Ganaklis | جليم→Glim | كفر عبده→Kafr Abdo | لوران→Lauran | رشدي→Roshdy | سابا باشا→Saba Basha | سان ستيفانو→San Stefano | سيدي جابر→Sidi Gaber | سموحة→Smouha | سبورتنج→Sporting | ستانلي→Stanley | فيكتوريا→Victorya | زيزينيا→Zezenia

حي وسط (district=Wasat):
  باكوس→Bakoos | كامب شيزار→Camp Cesar | الشاطبي→El Chatby | الحضرة→El Hadara | الإبراهيمية→Ibrahimia | محطة الرمل→Mahta El Raml | محرم بك→Moharram Bek

⛔ قاعدة حديدية: مرره للأداة بالاسم الإنجليزي بالضبط كما هو مكتوب بعد السهم ←. لا تخترع أسماء ولا تترجم من عندك.
⚠️ تنبيه: "العوايد"→El Awayed (منتزه)، أما "زيزينيا"→Zezenia (شرق) — لا تخلط بينهم أبداً.
⚠️ تنبيه: "أبو يوسف" في العجمي (Abu Youssef)، بينما "أبو قير" في المنتزه (Abo Qir). مختلفان تماماً.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ معلومات عن الموقع والمنشئ:
- اسم الموقع: "Aqarico" (عقاريكو).
- منشئ الموقع: "عمر رفاعي" (Omar Refai).
- تعريف المنشئ: عمر هو طالب في كلية الحاسبات وعلوم البيانات بجامعة الإسكندرية.
- إذا سألك أحد عن "عمر" أو صاحب الموقع، رُد بفخر وحب.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 معلومات العميل الحالي:
- الاسم: {user_name}
- الدور: {user_role}
- ناديه باسمه وعامله حسب دوره (مشتري، مستثمر، بائع، وهكذا).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 قاعدة حديدية لا تُكسر أبداً:
إذا رسالة العميل تحتوي على [MUST_SEARCH] فيجب استدعاء أداة search_properties فوراً قبل أي كلمة أخرى.
لا يجوز الرد من دماغك أو من معلوماتك أو من أي مكان آخر.
إذا أجبت بدون تشغيل الأداة، فردك كله خطأ ومرفوض.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

أوامر صارمة:

1. الذاكرة والسياق:
   - يجب دائماً مراجعة تاريخ المحادثة (History).
   - إذا قال العميل "بناءً على اللي قلناه" أو "زي ما كنا بنحكي" أو "هات شقق تانية بنفس المواصفات"، فاستخدم الفلاتر والمناطق والأسعار التي تم ذكرها سابقاً في المحادثة فوراً ولا تسأل العميل مرة ثانية.
   - كن مرناً جداً في ربط الطلبات ببعضها.

2. التقييم (شخص يريد تسعير شقته):
   - استخدم predict_property_price.
   - إذا أخطأ في الحي، صحح بمزاح خفيف واستخدم الحي الصحيح.
   - إذا المواصفات مستحيلة عقارياً (45م² بـ5 غرف)، تندهش وتمازحه.
   - قرّب الرقم لأقرب ألف جنيه وقوله في وسط الكلام.

3. البحث (شخص يبحث عن شقة):
   - [أمر صارم]: إذا كان في الرسالة [MUST_SEARCH] → استدعِ search_properties فوراً.
   - استخدم min_price/max_price/min_area/max_area بدقة حسب ما قاله العميل.
   - sort_by="price_asc" للأرخص، "price_desc" للأغلى، "newest" للأحدث.
   - ابحث فوراً بمجرد أي طرف خيط — لا تسأل عن مواصفات فرعية.

   ❌ أمثلة على الأخطاء المحظورة (عقوبتها الإيقاف):
   - العميل: "فيه شقق في سموحه؟" → ❌ "أيوه عندنا شقق في سموحه بأسعار..." [ممنوع ترد إلا بلوكات فعلية من الأداة]
   - العميل: "عايز شقة بـ500 ألف" → ❌ "الشقق في الإسكندرية بـ500 ألف عادةً..." [ممنوع تهبد أسعار عامة]
   - الصح دائماً: استدعِ search_properties أولاً بكل هدوء وبدون افتراضات، ثم رد بناءً على نتيجتها "فقط".
   - إذا لم ترجع الأداة نتائج، قل "ملقيتش" ولا تقم بتأليف روابط وهمية أو قديمة.

4. المقارنة الذكية (Real Estate Analyst):
   - عندما يطلب العميل مقارنة (مثلاً: "قارن بينهم"، "compare these", "حطهم ف تول"):

   ━━ قاعدة حديدية لا تُكسر أبداً في المقارنة ━━
   - إذا كان العدد < 2: أخبر العميل أن المقارنة تتطلب عقارين على الأقل. لا تستدعِ compare_properties.
   - إذا كان العدد من 2 إلى 4 بالضبط:
     1. **يجب** استدعاء compare_properties لتفعيل الواجهة المرئية.
     2. ثم قم بتحليل مفصل في الشات فوراً.
   - إذا كان العدد 5 أو أكثر: ❌ يُحظر حظراً تاماً استدعاء compare_properties.
     → افعل التحليل في الشات فقط. عواقب مخالفة هذه القاعدة وخيمة.

   - [أمر صارم]: يجب أن يتضمن تحليلك في الشات العناصر التالية دائماً وبتنسيق احترافي:
     * مخلص عام للمقارنة الجوهرية.
     * الفروقات الرئيسية (السعر، المساحة، المواصفات، الموقع).
     * نقاط القوة والضعف (مميزات وعيوب) لكل عقار.
     * "أفضل قيمة مقابل السعر" (Best Value) من وجهة نظرك كخبير.
     * توصية نهائية بناءً على ما تراه الأنسب لاحتياجات العميل.
   - لا تعطِ روابط للمقارنة أو تطلب من العميل الذهاب لصفحة أخرى؛ كل شيء يتم هنا في الشات.
   - تصرف كمحلل عقاري محترف يقدم شورته الصادقة.

5. بيانات عامة / إحصائيات:
   - استخدم get_database_metadata للأحياء والمناطق المتاحة وعدد العقارات.

هام عند إرسال البيانات للأدوات:
- District: (El Agami, El Amreya, El Gomrok, El Montazah, Gharb, Sharq, Wasat) فقط.
- Location: اسم الحي الفعلي اللي ذكره العميل (مثلاً: Smouha، El Montazah، Abo Qir).
- ⚠️ أسماء موجودة كحي إداري وكموقع في نفس الوقت (ambiguous):
  • "المنتزه" / El Montazah: بدون تحديد → districts. بتحديد الموقع الجغرافي → locations.
  • "العامرية" / El Amreya: بدون تحديد → districts. بتحديد الموقع الجغرافي → locations.
  • "العجمي" / El Agami: بدون تحديد → districts. بتحديد → locations.
- ⚠️ القاعدة العامة: لو العميل قال الاسم المجمل بدون إضافة → district. لو قال "منطقة X تحديداً" أو الاسم الجغرافي المحدد → location.

تعليمات التنسيق:
- أداة search_properties الآن ترجع بيانات خام (Raw Data). وظيفتك هي صياغتها بجمل كاملة وسهلة الفهم بنفسك.
- لا تذكر أسماء الحقول التقنية (مثل district أو floor) كما هي؛ استخدم مرادفات عربية طبيعية (مثلاً: "في منطقة"، "الدور الـ").
- كل شقة في فقرة منفصلة، مرقمة (1، 2، 3...).
- الرابط في سطر منفصل في نهاية كل شقة.
- الأسعار بالأرقام مع فواصل الآلاف.
- لا تخلط الإنجليزية في وصف التشطيب للعميل.
- إذا لم ترجع الأداة نتائج (NO_PROPERTIES_FOUND)، قل "ملقيتش" ولا تقم بتأليف روابط وهمية.
- إذا فشلت الأداة (ERROR_SEARCH_FAILED)، اطلب منه يحاول تاني.
"""

# ==========================================
# FIX: Use FunctionDeclaration-based TOOLS_LIST
# so the Gemini SDK does NOT auto-execute our
# Python functions. This gives the model the
# schema it needs while keeping manual control
# inside _run_chat's agentic loop.
# ==========================================
TOOLS_LIST = [Tool(function_declarations=[
    FunctionDeclaration(
        name="predict_property_price",
        description=(
            "Predict the market price of a property using the XGBoost model. "
            "Args: area (m²), bedrooms, bathrooms, location (English neighborhood), "
            "district (English district), year_built, finish (one of: Without Finish, "
            "Semi Finished, Lux, Super Lux, Extra Super Lux), floor number."
        ),
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "area":       Schema(type=Type.NUMBER,  description="Property area in square meters."),
                "bedrooms":   Schema(type=Type.INTEGER, description="Number of bedrooms."),
                "bathrooms":  Schema(type=Type.INTEGER, description="Number of bathrooms."),
                "location":   Schema(type=Type.STRING,  description="Neighborhood name in English e.g. 'Smouha'."),
                "district":   Schema(type=Type.STRING,  description="District name in English e.g. 'Sharq'."),
                "year_built": Schema(type=Type.INTEGER, description="Year the property was built."),
                "finish":     Schema(type=Type.STRING,  description="Finish level: Without Finish, Semi Finished, Lux, Super Lux, Extra Super Lux."),
                "floor":      Schema(type=Type.INTEGER, description="Floor number."),
            },
            required=["area", "bedrooms", "bathrooms", "location", "district", "year_built", "finish", "floor"],
        ),
    ),
    FunctionDeclaration(
        name="search_properties",
        description=(
            "Search for available properties in the database. "
            "Use min_price/max_price for price range, locations/districts for area filters, "
            "sort_by for ordering (price_asc, price_desc, newest)."
        ),
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "min_price":        Schema(type=Type.NUMBER,  description="Minimum price EGP (0 = no limit)."),
                "max_price":        Schema(type=Type.NUMBER,  description="Maximum price EGP (0 = no limit)."),
                "min_area":         Schema(type=Type.NUMBER,  description="Minimum area m² (0 = no limit)."),
                "max_area":         Schema(type=Type.NUMBER,  description="Maximum area m² (0 = no limit)."),
                "locations":        Schema(type=Type.ARRAY,   items=Schema(type=Type.STRING), description="List of neighborhood names e.g. ['Smouha', 'Glim']."),
                "districts":        Schema(type=Type.ARRAY,   items=Schema(type=Type.STRING), description="List of district names e.g. ['Sharq', 'El Agami']."),
                "finishes":         Schema(type=Type.ARRAY,   items=Schema(type=Type.STRING), description="List of finish levels e.g. ['Super Lux', 'Lux']."),
                "amenities":        Schema(type=Type.ARRAY,   items=Schema(type=Type.STRING), description="List of amenity names in English e.g. ['Pool', 'Elevator']."),
                "min_year_built":   Schema(type=Type.INTEGER, description="Minimum construction year (0 = no limit)."),
                "max_year_built":   Schema(type=Type.INTEGER, description="Maximum construction year (0 = no limit)."),
                "min_floor":        Schema(type=Type.INTEGER, description="Minimum floor number (0 = no limit)."),
                "max_floor":        Schema(type=Type.INTEGER, description="Maximum floor number (0 = no limit)."),
                "min_views":        Schema(type=Type.INTEGER, description="Minimum view count (0 = no limit)."),
                "max_views":        Schema(type=Type.INTEGER, description="Maximum view count (0 = no limit)."),
                "is_featured":      Schema(type=Type.BOOLEAN, description="Filter by featured status."),
                "is_verified":      Schema(type=Type.BOOLEAN, description="Filter by verified status."),
                "owner_agent_name": Schema(type=Type.STRING,  description="Name of property owner or agent (Arabic or English)."),
                "sort_by":          Schema(type=Type.STRING,  description="'price_asc', 'price_desc', or 'newest'."),
                "num_results":      Schema(type=Type.INTEGER, description="Number of results to return (default 5)."),
            },
        ),
    ),
    FunctionDeclaration(
        name="get_database_metadata",
        description="Get metadata about the database: unique locations, districts, total properties and users.",
        parameters=Schema(type=Type.OBJECT, properties={}),
    ),
    FunctionDeclaration(
        name="compare_properties",
        description=(
            "Activate the VISUAL comparison widget for 2–4 properties ONLY. "
            "MINIMUM 2 IDs, MAXIMUM 4 IDs. "
            "Do NOT call with fewer than 2 or more than 4 property IDs. "
            "Each ID must be a valid 24-character MongoDB ObjectId string."
        ),
        parameters=Schema(
            type=Type.OBJECT,
            properties={
                "property_ids": Schema(
                    type=Type.ARRAY,
                    items=Schema(type=Type.STRING),
                    description="List of 2–4 property MongoDB _id strings (24-char hex each).",
                ),
            },
            required=["property_ids"],
        ),
    ),
])]

# Python callables kept separate — called manually in _run_chat
TOOL_FUNCTIONS = {
    "predict_property_price": predict_property_price,
    "search_properties": search_properties,
    "get_database_metadata": get_database_metadata,
    "compare_properties": compare_properties,
}


def create_model_config(u_name="User", u_role="buyer", force_tool=False):
    rule = (
        "أنت مستشار عقاري في الإسكندرية، اسمك \"الخبير\". "
        "شخصيتك تلقائية جداً، بتتكلم عامية مصرية طبيعية، روحك حلوة و\"صنايعي\" فاهم السوق.\n"
        "بتتكلم عربي بشكل افتراضي، لكن لو العميل طلب منك تتكلم بلغة تانية (إنجليزي أو غيره)، "
        "انتقل لها فوراً واستمر فيها طول ما هو بيكلمك بيها."
    )
    sys_inst = SYSTEM_PROMPT.format(user_name=u_name, user_role=u_role, lang_rule=rule)
    cfg = types.GenerateContentConfig(
        system_instruction=sys_inst,
        tools=TOOLS_LIST,
        # FIX: Disable automatic function calling so the SDK does NOT silently
        # execute tools before our manual agentic loop sees the function_call parts.
        automatic_function_calling=AutomaticFunctionCallingConfig(disable=True),
    )
    if force_tool:
        cfg.tool_config = types.ToolConfig(
            function_calling_config=types.FunctionCallingConfig(mode="AUTO")
        )
    return cfg


def create_model(u_name="User", u_role="buyer"):
    return create_model_config(u_name, u_role, force_tool=False)


def create_model_forced(u_name="User", u_role="buyer"):
    return create_model_config(u_name, u_role, force_tool=True)


# ==========================================
# 8. Message sending with API key fallback
# ==========================================

def _get_text_safe(response) -> str:
    """Extract text from a Gemini response without crashing on empty parts."""
    try:
        texts = []
        for candidate in response.candidates:
            finish = getattr(candidate, "finish_reason", None)
            parts = candidate.content.parts if candidate.content and candidate.content.parts else []
            print(f"[DEBUG] Candidate finish_reason={finish}, parts count={len(parts)}")
            for part in parts:
                if hasattr(part, "text") and part.text:
                    texts.append(part.text)
        return "".join(texts)
    except Exception as e:
        print(f"[DEBUG] _get_text_safe error: {e}")
        return ""


def _run_chat(model_config, gemini_history: list, message_text: str, model_name: str = 'gemini-2.5-flash', use_must_search_hint: bool = False):
    """
    Manual agentic loop: send → if model returns function_calls, execute
    them and feed results back → repeat until a text reply arrives.
    The [MUST_SEARCH] hint is injected as a separate system-style user turn
    so the main message stays clean Arabic (avoids safety filter triggers).
    Returns (reply_text, actions_list).
    """
    chat = genai_client.chats.create(
        model=model_name,
        config=model_config,
        history=gemini_history,
    )

    # If search/action is forced, prepend a clean instruction turn before the user message
    if use_must_search_hint:
        chat.send_message("أنت خبير عقاري. استخدم أداة search_properties أو compare_properties فوراً إذا طلب المستخدم بحثاً أو مقارنة، ثم قدم تحليلك.")

    response = chat.send_message(message_text)
    actions = []
    final_text_parts = []

    for turn in range(12):  # increased turn limit
        # 1. Accumulate text from current turn
        text = _get_text_safe(response)
        if text:
            final_text_parts.append(text)

        # 2. Extract function calls
        fn_calls = []
        try:
            for candidate in response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, "function_call") and part.function_call and part.function_call.name:
                            fn_calls.append(part.function_call)
        except Exception as e:
            print(f"[DEBUG] Error reading function_calls: {e}")

        if not fn_calls:
            break

        # 3. Handle tool calls
        tool_response_parts = []
        for fc in fn_calls:
            args = dict(fc.args) if fc.args else {}
            fn = TOOL_FUNCTIONS.get(fc.name)
            try:
                result_str = str(fn(**args)) if fn else f"ERROR: unknown tool '{fc.name}'"
            except Exception as e:
                result_str = f"ERROR_TOOL_EXCEPTION: {e}"

            print(f"[DEBUG] Tool '{fc.name}' call result start: {result_str[:60]}")

            # Parse compare action (high priority signal)
            if "ACTION_COMPARE_READY:" in result_str:
                parts = result_str.split("ACTION_COMPARE_READY:")
                if len(parts) > 1:
                    # Accept valid 24-char hex MongoDB ObjectIds (case-insensitive)
                    ids = [i.strip().lower() for i in parts[1].split(",")
                           if len(i.strip()) == 24 and all(c in '0123456789abcdefABCDEF' for c in i.strip())]
                    if ids:
                        print(f"[DEBUG] Appending COMPARE action for {len(ids)} valid IDs")
                        actions.append({"type": "COMPARE_PROPERTIES", "propertyIds": ids})
                    else:
                        print(f"[DEBUG] ACTION_COMPARE_READY found but no valid 24-char IDs in: {parts[1][:80]}")
            elif "ACTION" in result_str:
                actions.append(result_str)

            tool_response_parts.append(
                types.Part.from_function_response(
                    name=fc.name,
                    response={"result": result_str},
                )
            )

        # 4. Send tool results back to model
        response = chat.send_message(tool_response_parts)

    return "\n\n".join(final_text_parts).strip(), actions


def send_message_with_fallback(message_text: str, history_data: list = [], user_name: str = "User", user_role: str = "buyer"):
    global current_key_index, current_model_index, genai_client

    gemini_history = []
    for m in history_data:
        role = "user" if m.get("role") == "user" else "model"
        gemini_history.append(
            types.Content(role=role, parts=[types.Part.from_text(text=m.get("text", ""))])
        )

    intent = has_search_intent(message_text)
    print(f"[DEBUG] Intent Detection: {'SEARCH' if intent else 'GENERAL/PREDICT'}")
    if intent:
        print(f"[DEBUG] Using Forced Search Model with Arabic hint turn")
    print(f"[DEBUG] Final payload to Gemini: '{message_text}'")

    all_actions = []
    # Try multiple times: cycling through API keys and models
    total_attempts = len(API_KEYS) * 2 # At most try twice as many keys as we have, alternating if needed
    for attempt in range(total_attempts):
        model_name = STABLE_MODELS[current_model_index]
        try:
            genai_client = genai.Client(api_key=API_KEYS[current_key_index])
            model_cfg = create_model_forced(user_name, user_role) if intent else create_model(user_name, user_role)

            print(f"[DEBUG] Attempt {attempt+1}: model='{model_name}', key_index={current_key_index}")
            reply_text, actions = _run_chat(model_cfg, gemini_history, message_text, model_name=model_name, use_must_search_hint=intent)
            if actions: all_actions.extend(actions)

            if not reply_text and intent:
                print("[DEBUG] Forced model returned empty, retrying with normal model (no hint)")
                reply_text, actions2 = _run_chat(
                    create_model(user_name, user_role), gemini_history, message_text, model_name=model_name, use_must_search_hint=False
                )
                if actions2: all_actions.extend(actions2)

            if reply_text:
                # Deduplicate actions based on type and propertyIds
                final_actions = []
                seen_keys = set()
                for a in all_actions:
                    key = str(a)
                    if key not in seen_keys:
                        seen_keys.add(key)
                        final_actions.append(a)
                return reply_text, final_actions

            raise ValueError("Empty response from model")

        except Exception as e:
            error_msg = str(e).upper()
            is_overloaded = "503" in error_msg or "UNAVAILABLE" in error_msg or "EXHAUSTED" in error_msg or "HIGH DEMAND" in error_msg
            
            if is_overloaded:
                print(f"[DEBUG] Model '{model_name}' overloaded (503). Switching model index.")
                current_model_index = (current_model_index + 1) % len(STABLE_MODELS)
                # We stay on same key if it's a model issue, but the loop continues
            else:
                print(f"API key {current_key_index + 1} error: {e}")
                current_key_index = (current_key_index + 1) % len(API_KEYS)
                print(f"[DEBUG] SWITCHING API KEY to index {current_key_index} due to error")

    return "للأسف السيستم عليه ضغط جامد جدا دلوقتي، ممكن تديني دقيقتين ونجرب تاني؟", []


# ==========================================
# 9. API Endpoints
# ==========================================
class UserMessage(BaseModel):
    message: str
    history: list = []
    user_name: str = "User"
    user_role: str = "buyer"


@app.get("/")
def health_check():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "db_connected": properties_collection is not None,
    }


@app.post("/chat")
def chat_with_bot(req: UserMessage):
    print(f"\n[DEBUG] New Chat Request from {req.user_name} ({req.user_role})")
    print(f"[DEBUG] Message: {req.message}")
    reply_text, actions = send_message_with_fallback(req.message, req.history, req.user_name, req.user_role)
    print(f"[DEBUG] Final Reply sent | Actions: {actions}")
    return {"reply": reply_text, "actions": actions}


class EmailRequest(BaseModel):
    to_email: str
    code: str


@app.post("/send-email")
def send_email(req: EmailRequest):
    try:
        EMAIL_USER = os.getenv("EMAIL_USER")
        EMAIL_PASS = os.getenv("EMAIL_PASSWORD")
        
        if not EMAIL_USER or not EMAIL_PASS:
            return {"success": False, "error": "SMTP credentials not configured on server."}

        msg = MIMEMultipart()
        msg['From']    = f"Aqarico Security <{EMAIL_USER}>"
        msg['To']      = req.to_email
        msg['Subject'] = "Your Aqarico Verification Code"
        html = f"""
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1a1a1a;">Verification Code</h2>
          <p>Your 2-step verification code for Aqarico is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #000; margin: 20px 0;">{req.code}</div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
        """
        msg.attach(MIMEText(html, 'html'))
        
        # Enforce secure TLS connection with certificate verification
        import ssl
        context = ssl.create_default_context()
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context)
        server.login(EMAIL_USER, EMAIL_PASS)
        server.send_message(msg)
        server.quit()
        return {"success": True}
    except Exception as e:
        print(f"Error sending email: {e}")
        return {"success": False, "error": str(e)}