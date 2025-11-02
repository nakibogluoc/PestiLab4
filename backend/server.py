from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from openpyxl import load_workbook
import io
import qrcode
import barcode
from barcode.writer import ImageWriter
from reportlab.lib.pagesizes import A4, mm
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import pytz
from io import BytesIO
import base64
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'laboratory-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Timezone
ISTANBUL_TZ = pytz.timezone('Europe/Istanbul')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# === MODELS ===

class UserRole(str):
    ADMIN = "admin"
    MANAGER = "manager"
    ANALYST = "analyst"
    READONLY = "readonly"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    role: str = "analyst"
    created_at: str = Field(default_factory=lambda: datetime.now(ISTANBUL_TZ).isoformat())

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str = "analyst"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Compound(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    cas_number: str
    solvent: str
    stock_value: float
    stock_unit: str = "mg"
    critical_value: float = 100.0
    critical_unit: str = "mg"
    last_serial: int = 0
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(ISTANBUL_TZ).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(ISTANBUL_TZ).isoformat())

class CompoundCreate(BaseModel):
    name: str
    cas_number: str
    solvent: str
    stock_value: float
    stock_unit: str = "mg"
    critical_value: float = 100.0
    critical_unit: str = "mg"
    notes: Optional[str] = None

class CompoundUpdate(BaseModel):
    name: Optional[str] = None
    cas_number: Optional[str] = None
    solvent: Optional[str] = None
    stock_value: Optional[float] = None
    stock_unit: Optional[str] = None
    critical_value: Optional[float] = None
    critical_unit: Optional[str] = None
    notes: Optional[str] = None

class SolventDensity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    solvent_name: str
    temperature_c: float
    density_g_per_ml: float
    created_at: str = Field(default_factory=lambda: datetime.now(ISTANBUL_TZ).isoformat())

class SolventDensityCreate(BaseModel):
    solvent_name: str
    temperature_c: float
    density_g_per_ml: float

class WeighingInput(BaseModel):
    compound_id: str
    weighed_amount: float  # mg
    purity: float = 100.0  # %
    target_concentration: float  # mg/L or mg/kg
    concentration_mode: str = "mg/L"  # "mg/L" or "mg/kg"
    temperature_c: float = 25.0
    solvent: Optional[str] = None

class Usage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    compound_name: str
    cas_number: str
    weighed_amount: float  # mg
    purity: float  # %
    actual_mass: float  # mg (corrected for purity)
    target_concentration: float  # mg/L or mg/kg
    concentration_mode: str  # "mg/L" or "mg/kg"
    required_volume: float  # mL
    required_solvent_mass: float  # g
    actual_concentration: float  # ppm
    deviation: float  # %
    solvent: str
    temperature_c: float
    solvent_density: float  # g/mL
    remaining_stock: float
    remaining_stock_unit: str
    prepared_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(ISTANBUL_TZ).isoformat())

class Label(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    compound_id: str
    usage_id: str
    label_code: str
    compound_name: str
    cas_number: str
    concentration: str
    prepared_by: str
    date: str
    qr_data: str
    created_at: str = Field(default_factory=lambda: datetime.now(ISTANBUL_TZ).isoformat())

class ExcelImportPreview(BaseModel):
    to_insert: List[Dict[str, Any]]
    to_update: List[Dict[str, Any]]
    to_skip: List[Dict[str, Any]]
    total_rows: int

class ExcelImportResponse(BaseModel):
    message: str
    compounds_added: int
    compounds_updated: int
    compounds_skipped: int
    densities_added: int = 0

# === HELPER FUNCTIONS ===

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        user = await db.users.find_one({"username": username}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def normalize_string(s: str) -> str:
    """Normalize strings: trim, uppercase, remove extra spaces"""
    if not s:
        return ""
    return ' '.join(str(s).strip().upper().split())

def normalize_compound_name(name: str) -> str:
    """Normalize compound name to generate code prefix (first 3 Latin letters)"""
    # Turkish character mapping
    char_map = {
        'İ': 'I', 'ı': 'i', 'Ğ': 'G', 'ğ': 'g',
        'Ş': 'S', 'ş': 's', 'Ç': 'C', 'ç': 'c',
        'Ö': 'O', 'ö': 'o', 'Ü': 'U', 'ü': 'u'
    }
    
    normalized = ''
    for char in name:
        if char in char_map:
            normalized += char_map[char]
        elif char.isalpha():
            normalized += char
    
    # Get first 3 letters and uppercase
    prefix = normalized[:3].upper()
    if len(prefix) < 3:
        prefix = prefix.ljust(3, 'X')
    
    return prefix

def find_column_by_aliases(headers: Dict, aliases: List[str]) -> Optional[int]:
    """Find column index by checking multiple alias names (case-insensitive)"""
    for header_name, col_idx in headers.items():
        normalized_header = normalize_string(header_name)
        for alias in aliases:
            if normalize_string(alias) == normalized_header:
                return col_idx
    return None

def interpolate_density(temperature: float, density_data: List[Dict]) -> tuple[float, bool]:
    """
    Interpolate or extrapolate density for given temperature.
    Returns (density, is_extrapolated)
    """
    if not density_data:
        return 0.8, False  # Default density
    
    # Sort by temperature
    sorted_data = sorted(density_data, key=lambda x: x['temperature_c'])
    
    # Exact match
    for d in sorted_data:
        if d['temperature_c'] == temperature:
            return d['density_g_per_ml'], False
    
    # Interpolation
    for i in range(len(sorted_data) - 1):
        t1, d1 = sorted_data[i]['temperature_c'], sorted_data[i]['density_g_per_ml']
        t2, d2 = sorted_data[i+1]['temperature_c'], sorted_data[i+1]['density_g_per_ml']
        
        if t1 <= temperature <= t2:
            # Linear interpolation
            density = d1 + (d2 - d1) * (temperature - t1) / (t2 - t1)
            return density, False
    
    # Extrapolation
    if temperature < sorted_data[0]['temperature_c']:
        # Extrapolate below
        t1, d1 = sorted_data[0]['temperature_c'], sorted_data[0]['density_g_per_ml']
        t2, d2 = sorted_data[1]['temperature_c'], sorted_data[1]['density_g_per_ml']
    else:
        # Extrapolate above
        t1, d1 = sorted_data[-2]['temperature_c'], sorted_data[-2]['density_g_per_ml']
        t2, d2 = sorted_data[-1]['temperature_c'], sorted_data[-1]['density_g_per_ml']
    
    density = d1 + (d2 - d1) * (temperature - t1) / (t2 - t1)
    return density, True  # Extrapolated

def generate_qr_code(data: str) -> str:
    """Generate QR code and return as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=1)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

def generate_barcode(code: str) -> str:
    """Generate Code128 barcode and return as base64 string"""
    buffer = BytesIO()
    code128 = barcode.get('code128', code, writer=ImageWriter())
    code128.write(buffer, {'write_text': False, 'module_height': 8, 'module_width': 0.2})
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()

# === AUTH ROUTES ===

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate, current_user: User = Depends(get_current_user)):
    # Only admin can create users
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can create users")
    
    # Check if username exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        role=user_data.role
    )
    
    doc = user.model_dump()
    doc['password'] = hashed_password.decode('utf-8')
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"username": login_data.username})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not bcrypt.checkpw(login_data.password.encode('utf-8'), user['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create access token
    access_token = create_access_token(data={"sub": user['username']})
    
    user_obj = User(**{k: v for k, v in user.items() if k != 'password'})
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_current_user)):
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [User(**u) for u in users]

# === SOLVENT DENSITY ROUTES ===

@api_router.post("/solvent-densities", response_model=SolventDensity)
async def create_solvent_density(data: SolventDensityCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "readonly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create density data")
    
    density = SolventDensity(**data.model_dump())
    await db.solvent_densities.insert_one(density.model_dump())
    return density

@api_router.get("/solvent-densities", response_model=List[SolventDensity])
async def get_solvent_densities(current_user: User = Depends(get_current_user)):
    densities = await db.solvent_densities.find({}, {"_id": 0}).to_list(1000)
    return [SolventDensity(**d) for d in densities]

@api_router.get("/solvent-densities/{solvent_name}/at/{temperature}")
async def get_density_at_temperature(
    solvent_name: str,
    temperature: float,
    current_user: User = Depends(get_current_user)
):
    density_data = await db.solvent_densities.find(
        {"solvent_name": solvent_name},
        {"_id": 0}
    ).to_list(100)
    
    if not density_data:
        raise HTTPException(status_code=404, detail=f"No density data found for solvent: {solvent_name}")
    
    density, is_extrapolated = interpolate_density(temperature, density_data)
    
    return {
        "solvent_name": solvent_name,
        "temperature_c": temperature,
        "density_g_per_ml": round(density, 4),
        "is_extrapolated": is_extrapolated,
        "warning": "Extrapolated density - outside measured range" if is_extrapolated else None
    }

# === COMPOUND ROUTES ===

@api_router.post("/compounds", response_model=Compound)
async def create_compound(compound_data: CompoundCreate, current_user: User = Depends(get_current_user)):
    if current_user.role == "readonly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create compounds")
    
    compound = Compound(**compound_data.model_dump())
    doc = compound.model_dump()
    
    await db.compounds.insert_one(doc)
    
    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user": current_user.username,
        "action": "create_compound",
        "compound_id": compound.id,
        "compound_name": compound.name,
        "timestamp": datetime.now(ISTANBUL_TZ).isoformat()
    })
    
    return compound

@api_router.get("/compounds", response_model=List[Compound])
async def get_compounds(current_user: User = Depends(get_current_user)):
    compounds = await db.compounds.find({}, {"_id": 0}).to_list(10000)
    return [Compound(**c) for c in compounds]

@api_router.get("/compounds/{compound_id}", response_model=Compound)
async def get_compound(compound_id: str, current_user: User = Depends(get_current_user)):
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")
    return Compound(**compound)

@api_router.put("/compounds/{compound_id}", response_model=Compound)
async def update_compound(compound_id: str, update_data: CompoundUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role == "readonly":
        raise HTTPException(status_code=403, detail="Read-only users cannot update compounds")
    
    compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(ISTANBUL_TZ).isoformat()
    
    await db.compounds.update_one({"id": compound_id}, {"$set": update_dict})
    
    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user": current_user.username,
        "action": "update_compound",
        "compound_id": compound_id,
        "changes": update_dict,
        "timestamp": datetime.now(ISTANBUL_TZ).isoformat()
    })
    
    updated_compound = await db.compounds.find_one({"id": compound_id}, {"_id": 0})
    return Compound(**updated_compound)

@api_router.delete("/compounds/{compound_id}")
async def delete_compound(compound_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admin can delete compounds")
    
    result = await db.compounds.delete_one({"id": compound_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Compound not found")
    
    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user": current_user.username,
        "action": "delete_compound",
        "compound_id": compound_id,
        "timestamp": datetime.now(ISTANBUL_TZ).isoformat()
    })
    
    return {"message": "Compound deleted successfully"}

# === ENHANCED EXCEL IMPORT ===

@api_router.post("/compounds/import/preview", response_model=ExcelImportPreview)
async def preview_excel_import(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "readonly":
        raise HTTPException(status_code=403, detail="Read-only users cannot import data")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    contents = await file.read()
    workbook = load_workbook(filename=io.BytesIO(contents), read_only=True)
    
    to_insert = []
    to_update = []
    to_skip = []
    
    # Try to find compounds sheet
    sheet = None
    for sheet_name in workbook.sheetnames:
        if 'compound' in sheet_name.lower() or sheet_name == workbook.sheetnames[0]:
            sheet = workbook[sheet_name]
            break
    
    if not sheet:
        sheet = workbook.active
    
    # Column name aliases
    name_aliases = ["Analit Adı", "Compound", "Compound Name", "Name"]
    cas_aliases = ["CAS", "CAS No", "CAS Number"]
    solvent_aliases = ["Solvent", "Çözücü", "Önerilen Solvent", "Default Solvent"]
    
    # Find header row
    header_row = None
    headers = {}
    
    for row_idx, row in enumerate(sheet.iter_rows(min_row=1, max_row=100), start=1):
        row_values = [cell.value for cell in row if cell.value]
        if len(row_values) >= 2:
            # Check if this looks like a header row
            for cell in row:
                if cell.value:
                    val_str = str(cell.value)
                    if any(alias in val_str for alias in name_aliases + cas_aliases):
                        header_row = row_idx
                        for c in row:
                            if c.value:
                                headers[c.value] = c.column
                        break
        if header_row:
            break
    
    if not header_row:
        raise HTTPException(status_code=400, detail="Could not find header row with required columns")
    
    # Find column indices using aliases
    name_col = find_column_by_aliases(headers, name_aliases)
    cas_col = find_column_by_aliases(headers, cas_aliases)
    solvent_col = find_column_by_aliases(headers, solvent_aliases)
    
    if not name_col or not cas_col:
        raise HTTPException(status_code=400, detail=f"Required columns not found. Headers found: {list(headers.keys())}")
    
    # Process rows
    for row in sheet.iter_rows(min_row=header_row + 1, max_row=header_row + 500):
        name = row[name_col - 1].value if name_col else None
        cas = row[cas_col - 1].value if cas_col else None
        solvent = row[solvent_col - 1].value if solvent_col else "Acetone"
        
        if not name or not cas or str(cas).lower() == 'nan' or str(name).startswith('='):
            continue
        
        name = str(name).strip()
        cas = str(cas).strip().upper()
        solvent = str(solvent).strip() if solvent else "Acetone"
        
        # Check if exists
        existing = await db.compounds.find_one({
            "$or": [
                {"cas_number": cas},
                {"cas_number": cas, "name": name}
            ]
        })
        
        compound_data = {
            "name": name,
            "cas_number": cas,
            "solvent": solvent,
            "stock_value": 1000.0,
            "stock_unit": "mg",
            "critical_value": 100.0
        }
        
        if existing:
            compound_data["id"] = existing["id"]
            to_update.append(compound_data)
        else:
            to_insert.append(compound_data)
    
    return ExcelImportPreview(
        to_insert=to_insert[:50],  # Limit preview
        to_update=to_update[:50],
        to_skip=to_skip[:50],
        total_rows=len(to_insert) + len(to_update) + len(to_skip)
    )

@api_router.post("/compounds/import", response_model=ExcelImportResponse)
async def import_compounds(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "readonly":
        raise HTTPException(status_code=403, detail="Read-only users cannot import data")
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    contents = await file.read()
    workbook = load_workbook(filename=io.BytesIO(contents), read_only=True)
    
    added = 0
    updated = 0
    skipped = 0
    densities_added = 0
    
    # Process Compounds Sheet
    sheet = None
    for sheet_name in workbook.sheetnames:
        if 'compound' in sheet_name.lower() or sheet_name == workbook.sheetnames[0]:
            sheet = workbook[sheet_name]
            break
    
    if not sheet:
        sheet = workbook.active
    
    # Column aliases
    name_aliases = ["Analit Adı", "Compound", "Compound Name", "Name"]
    cas_aliases = ["CAS", "CAS No", "CAS Number"]
    solvent_aliases = ["Solvent", "Çözücü", "Önerilen Solvent", "Default Solvent"]
    
    # Find header row
    header_row = None
    headers = {}
    
    for row_idx, row in enumerate(sheet.iter_rows(min_row=1, max_row=100), start=1):
        row_values = [cell.value for cell in row if cell.value]
        if len(row_values) >= 2:
            for cell in row:
                if cell.value:
                    val_str = str(cell.value)
                    if any(alias in val_str for alias in name_aliases + cas_aliases):
                        header_row = row_idx
                        for c in row:
                            if c.value:
                                headers[c.value] = c.column
                        break
        if header_row:
            break
    
    if not header_row:
        raise HTTPException(status_code=400, detail="Could not find header row")
    
    # Find columns
    name_col = find_column_by_aliases(headers, name_aliases)
    cas_col = find_column_by_aliases(headers, cas_aliases)
    solvent_col = find_column_by_aliases(headers, solvent_aliases)
    
    if not name_col or not cas_col:
        raise HTTPException(status_code=400, detail=f"Required columns not found. Found: {list(headers.keys())}")
    
    # Process rows
    for row in sheet.iter_rows(min_row=header_row + 1, max_row=header_row + 1000):
        name = row[name_col - 1].value if name_col else None
        cas = row[cas_col - 1].value if cas_col else None
        solvent = row[solvent_col - 1].value if solvent_col else "Acetone"
        
        if not name or not cas or str(cas).lower() == 'nan' or str(name).startswith('='):
            skipped += 1
            continue
        
        name = str(name).strip()
        cas = str(cas).strip().upper()
        solvent = str(solvent).strip() if solvent else "Acetone"
        
        # Upsert logic
        existing = await db.compounds.find_one({"cas_number": cas})
        
        if existing:
            # Update
            await db.compounds.update_one(
                {"cas_number": cas},
                {"$set": {
                    "name": name,
                    "solvent": solvent,
                    "updated_at": datetime.now(ISTANBUL_TZ).isoformat()
                }}
            )
            updated += 1
        else:
            # Insert
            compound = Compound(
                name=name,
                cas_number=cas,
                solvent=solvent,
                stock_value=1000.0,
                stock_unit="mg",
                critical_value=100.0,
                critical_unit="mg"
            )
            await db.compounds.insert_one(compound.model_dump())
            added += 1
    
    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user": current_user.username,
        "action": "import_excel",
        "details": f"Added: {added}, Updated: {updated}, Skipped: {skipped}",
        "timestamp": datetime.now(ISTANBUL_TZ).isoformat()
    })
    
    return ExcelImportResponse(
        message="Import completed successfully",
        compounds_added=added,
        compounds_updated=updated,
        compounds_skipped=skipped,
        densities_added=densities_added
    )

# === WEIGHING & CALCULATION WITH TEMPERATURE ===

@api_router.post("/weighing", response_model=Dict[str, Any])
async def create_weighing(
    weighing_data: WeighingInput,
    current_user: User = Depends(get_current_user)
):
    if current_user.role == "readonly":
        raise HTTPException(status_code=403, detail="Read-only users cannot create weighing records")
    
    # Get compound
    compound = await db.compounds.find_one({"id": weighing_data.compound_id}, {"_id": 0})
    if not compound:
        raise HTTPException(status_code=404, detail="Compound not found")
    
    # Convert to mg and mL
    weighed_mg = weighing_data.weighed_amount
    if weighing_data.weighed_unit == "g":
        weighed_mg = weighing_data.weighed_amount * 1000
    elif weighing_data.weighed_unit == "µg":
        weighed_mg = weighing_data.weighed_amount / 1000
    
    volume_mL = weighing_data.prepared_volume
    if weighing_data.volume_unit == "L":
        volume_mL = weighing_data.prepared_volume * 1000
    elif weighing_data.volume_unit == "µL":
        volume_mL = weighing_data.prepared_volume / 1000
    
    # Get solvent density at temperature
    solvent_name = weighing_data.solvent or compound['solvent']
    temperature = weighing_data.temperature_c
    
    density_data = await db.solvent_densities.find(
        {"solvent_name": solvent_name},
        {"_id": 0}
    ).to_list(100)
    
    if density_data:
        solvent_density, is_extrapolated = interpolate_density(temperature, density_data)
    else:
        solvent_density = 0.8  # Default
        is_extrapolated = False
    
    # Calculate concentration (mg/mL)
    concentration = weighed_mg / volume_mL
    
    # Determine display unit
    if concentration < 1:
        display_concentration = concentration * 1000
        concentration_unit = "µg/mL"
    else:
        display_concentration = concentration
        concentration_unit = "mg/mL"
    
    # Round to 3 decimal places
    display_concentration = round(display_concentration, 3)
    solvent_density = round(solvent_density, 4)
    
    # Update stock
    new_stock = compound['stock_value'] - weighed_mg
    await db.compounds.update_one(
        {"id": weighing_data.compound_id},
        {"$set": {"stock_value": new_stock, "updated_at": datetime.now(ISTANBUL_TZ).isoformat()}}
    )
    
    # Increment serial number
    new_serial = compound['last_serial'] + 1
    await db.compounds.update_one(
        {"id": weighing_data.compound_id},
        {"$set": {"last_serial": new_serial}}
    )
    
    # Generate label code
    prefix = normalize_compound_name(compound['name'])
    label_code = f"{prefix}-{new_serial:04d}"
    
    # Create usage record
    usage = Usage(
        compound_id=weighing_data.compound_id,
        compound_name=compound['name'],
        cas_number=compound['cas_number'],
        weighed_amount=weighed_mg,
        weighed_unit="mg",
        prepared_volume=volume_mL,
        volume_unit="mL",
        concentration=display_concentration,
        concentration_unit=concentration_unit,
        solvent=solvent_name,
        temperature_c=temperature,
        solvent_density=solvent_density,
        remaining_stock=new_stock,
        remaining_stock_unit=compound['stock_unit'],
        prepared_by=current_user.username
    )
    
    await db.usages.insert_one(usage.model_dump())
    
    # Generate QR and barcode
    date_str = datetime.now(ISTANBUL_TZ).strftime("%Y-%m-%d")
    qr_data = f"LBL|code={label_code}|name={compound['name']}|cas={compound['cas_number']}|c={display_concentration} {concentration_unit}|dt={date_str}|by={current_user.username}"
    
    qr_base64 = generate_qr_code(qr_data)
    barcode_base64 = generate_barcode(label_code)
    
    # Create label record
    label = Label(
        compound_id=weighing_data.compound_id,
        usage_id=usage.id,
        label_code=label_code,
        compound_name=compound['name'],
        cas_number=compound['cas_number'],
        concentration=f"{display_concentration} {concentration_unit}",
        prepared_by=current_user.username,
        date=date_str,
        qr_data=qr_data
    )
    
    await db.labels.insert_one(label.model_dump())
    
    # Audit log
    await db.audit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "user": current_user.username,
        "action": "create_weighing",
        "compound_id": weighing_data.compound_id,
        "usage_id": usage.id,
        "label_code": label_code,
        "timestamp": datetime.now(ISTANBUL_TZ).isoformat()
    })
    
    return {
        "usage": usage.model_dump(),
        "label": label.model_dump(),
        "qr_code": qr_base64,
        "barcode": barcode_base64,
        "density_extrapolated": is_extrapolated
    }

# === USAGE & LABEL ROUTES ===

@api_router.get("/usages", response_model=List[Usage])
async def get_usages(
    compound_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    if compound_id:
        query['compound_id'] = compound_id
    
    usages = await db.usages.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Usage(**u) for u in usages]

@api_router.get("/labels", response_model=List[Label])
async def get_labels(current_user: User = Depends(get_current_user)):
    labels = await db.labels.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Label(**l) for l in labels]

@api_router.get("/labels/{label_id}")
async def get_label_with_codes(label_id: str, current_user: User = Depends(get_current_user)):
    label = await db.labels.find_one({"id": label_id}, {"_id": 0})
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    
    qr_base64 = generate_qr_code(label['qr_data'])
    barcode_base64 = generate_barcode(label['label_code'])
    
    return {
        "label": label,
        "qr_code": qr_base64,
        "barcode": barcode_base64
    }

# === DASHBOARD ===

@api_router.get("/dashboard")
async def get_dashboard(current_user: User = Depends(get_current_user)):
    # Get critical stocks
    all_compounds = await db.compounds.find({}, {"_id": 0}).to_list(10000)
    critical_stocks = []
    
    for comp in all_compounds:
        if comp['stock_value'] <= comp['critical_value']:
            critical_stocks.append(comp)
    
    # Recent usages
    recent_usages = await db.usages.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Stats
    total_compounds = len(all_compounds)
    total_usages = await db.usages.count_documents({})
    total_labels = await db.labels.count_documents({})
    
    return {
        "total_compounds": total_compounds,
        "total_usages": total_usages,
        "total_labels": total_labels,
        "critical_stocks": critical_stocks,
        "recent_usages": recent_usages
    }

# === SEARCH ===

@api_router.get("/search")
async def search(
    q: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user)
):
    # Search in compounds
    compounds = await db.compounds.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"cas_number": {"$regex": q, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    
    # Search in usages
    usages = await db.usages.find({
        "$or": [
            {"compound_name": {"$regex": q, "$options": "i"}},
            {"cas_number": {"$regex": q, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    
    return {
        "compounds": compounds,
        "usages": usages
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
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

# Initialize admin user and default solvent densities on startup
@app.on_event("startup")
async def initialize_defaults():
    # Create admin user
    admin_exists = await db.users.find_one({"username": "admin"})
    if not admin_exists:
        hashed_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt())
        admin_user = User(
            username="admin",
            email="admin@pestilab.com",
            role="admin"
        )
        doc = admin_user.model_dump()
        doc['password'] = hashed_password.decode('utf-8')
        await db.users.insert_one(doc)
        logger.info("Admin user created: username=admin, password=admin123")
    
    # Initialize default solvent densities
    density_count = await db.solvent_densities.count_documents({})
    if density_count == 0:
        default_densities = [
            {"solvent_name": "Water", "temperature_c": 20.0, "density_g_per_ml": 0.9982},
            {"solvent_name": "Water", "temperature_c": 25.0, "density_g_per_ml": 0.9970},
            {"solvent_name": "Methanol", "temperature_c": 20.0, "density_g_per_ml": 0.7918},
            {"solvent_name": "Methanol", "temperature_c": 25.0, "density_g_per_ml": 0.7866},
            {"solvent_name": "Acetonitrile", "temperature_c": 20.0, "density_g_per_ml": 0.7860},
            {"solvent_name": "Acetonitrile", "temperature_c": 25.0, "density_g_per_ml": 0.7830},
            {"solvent_name": "Acetone", "temperature_c": 20.0, "density_g_per_ml": 0.7899},
            {"solvent_name": "Acetone", "temperature_c": 25.0, "density_g_per_ml": 0.7846},
            {"solvent_name": "Isopropanol", "temperature_c": 20.0, "density_g_per_ml": 0.7850},
            {"solvent_name": "Isopropanol", "temperature_c": 25.0, "density_g_per_ml": 0.7810},
            {"solvent_name": "Toluene", "temperature_c": 20.0, "density_g_per_ml": 0.8670},
            {"solvent_name": "Toluene", "temperature_c": 25.0, "density_g_per_ml": 0.8660},
            {"solvent_name": "Hexane", "temperature_c": 20.0, "density_g_per_ml": 0.6606},
            {"solvent_name": "Hexane", "temperature_c": 25.0, "density_g_per_ml": 0.6548},
            {"solvent_name": "Ethanol", "temperature_c": 20.0, "density_g_per_ml": 0.7893},
            {"solvent_name": "Ethanol", "temperature_c": 25.0, "density_g_per_ml": 0.7851},
        ]
        
        for density_data in default_densities:
            density = SolventDensity(**density_data)
            await db.solvent_densities.insert_one(density.model_dump())
        
        logger.info(f"Initialized {len(default_densities)} default solvent density values")