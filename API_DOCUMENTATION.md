# PestiLab API Documentation

## Authentication

All endpoints (except `/auth/login`) require Bearer token authentication.

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "pestical",
  "password": "aceta135410207"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "username": "pestical",
    "email": "pestical@pestilab.com",
    "role": "analyst"
  }
}
```

## Weighing & Label Generation

### Save Weighing Record and Generate Label

**Endpoint:** `POST /api/weighing`

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {token}`

**Request Payload:**
```json
{
  "compound_id": "430beb9d-8c81-49e9-8080-1b88f44cdb59",
  "weighed_amount": 12.5,
  "purity": 99.0,
  "target_concentration": 1000,
  "concentration_mode": "mg/L",
  "temperature_c": 25.0,
  "solvent": "Acetone",
  "prepared_by": "Test User",
  "mix_code": "MIX-2025-001",
  "mix_code_show": true,
  "label_code": null,
  "label_code_source": "auto"
}
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `compound_id` | string (UUID) | Yes | Compound identifier |
| `weighed_amount` | number | Yes | Amount weighed in mg |
| `purity` | number | Yes | Purity percentage (0-100) |
| `target_concentration` | number | Yes | Target concentration in ppm |
| `concentration_mode` | string | Yes | Either "mg/L" or "mg/kg" |
| `temperature_c` | number | No | Temperature in Celsius (default: 25) |
| `solvent` | string | No | Solvent name (auto-filled from compound) |
| `prepared_by` | string | Yes | Name of person preparing solution |
| `mix_code` | string | No | Optional mix identification code |
| `mix_code_show` | boolean | No | Show mix code on label (default: true) |
| `label_code` | string | No | Manual label code override (null for auto) |
| `label_code_source` | string | No | "auto", "manual", or "excel" |

**Success Response (200 OK):**
```json
{
  "usage": {
    "id": "0106a39d-b94a-4bac-a8c3-...",
    "compound_id": "430beb9d...",
    "compound_name": "Tetramethrin",
    "cas_number": "7696-12-0",
    "weighed_amount": 12.5,
    "purity": 99.0,
    "actual_mass": 12.375,
    "target_concentration": 1000,
    "concentration_mode": "mg/L",
    "required_volume": 12.375,
    "required_solvent_mass": 9.707,
    "actual_concentration": 1000.0,
    "deviation": 0.0,
    "solvent": "Acetone",
    "temperature_c": 25.0,
    "solvent_density": 0.7846,
    "remaining_stock": 987.5,
    "remaining_stock_unit": "mg",
    "prepared_by": "Test User",
    "mix_code": "MIX-2025-001",
    "mix_code_show": true,
    "label_code_used": "TET-0003",
    "label_code_source": "auto",
    "created_at": "2025-11-02T22:05:45.123+03:00"
  },
  "label": {
    "id": "8a7f...",
    "compound_id": "430beb9d...",
    "usage_id": "0106a39d...",
    "label_code": "TET-0003",
    "compound_name": "Tetramethrin",
    "cas_number": "7696-12-0",
    "concentration": "1000.0 ppm",
    "prepared_by": "Test User",
    "date": "2025-11-02",
    "qr_data": "LBL|code=TET-0003|mix=MIX-2025-001|name=Tetramethrin|cas=7696-12-0|c=1000.0 ppm|dt=2025-11-02|by=Test User",
    "created_at": "2025-11-02T22:05:45.456+03:00"
  },
  "qr_code": "iVBORw0KGgoAAAANS...",
  "barcode": "iVBORw0KGgoAAAANS..."
}
```

**Error Responses:**

### 422 Unprocessable Entity (Validation Error)
```json
{
  "detail": {
    "error": "validation_failed",
    "fields": {
      "compound_id": "Compound ID is required",
      "weighed_amount": "Weighed amount must be positive"
    }
  }
}
```

### 404 Not Found
```json
{
  "detail": "Compound not found"
}
```

### 403 Forbidden
```json
{
  "detail": "Read-only users cannot create weighing records"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error message"
}
```

## Validation Endpoint

### Validate Weighing Input (Dry Run)

Test weighing calculation without saving to database.

**Endpoint:** `POST /api/weighing/validate`

**Request:** Same as save endpoint

**Response:**
```json
{
  "valid": true,
  "preview": {
    "compound_name": "Tetramethrin",
    "actual_mass_mg": 12.375,
    "required_volume_mL": 12.375,
    "solvent_density": 0.7846
  }
}
```

## Compound Search

### Fuzzy Search

**Endpoint:** `GET /api/search/fuzzy?q={query}&limit={20}`

**Parameters:**
- `q`: Search query (minimum 1 character)
- `limit`: Maximum results (default: 20, max: 100)

**Response:**
```json
{
  "query": "imid",
  "total_matches": 5,
  "compounds": [
    {
      "id": "...",
      "name": "Imidacloprid",
      "cas_number": "138261-41-3",
      "solvent": "Acetonitrile",
      "stock_value": 1000.0,
      "search_score": 180
    }
  ]
}
```

## Testing with curl

### Complete Test Flow

```bash
# 1. Login
TOKEN=$(curl -s -X POST "https://labelpro-app.preview.emergentagent.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"pestical","password":"aceta135410207"}' \
  | jq -r '.access_token')

# 2. Search for compound
curl -s "https://labelpro-app.preview.emergentagent.com/api/search/fuzzy?q=imid&limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq

# 3. Get compound ID
COMPOUND_ID=$(curl -s "https://labelpro-app.preview.emergentagent.com/api/compounds" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[0].id')

# 4. Validate weighing (dry run)
curl -s -X POST "https://labelpro-app.preview.emergentagent.com/api/weighing/validate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"compound_id\": \"$COMPOUND_ID\",
    \"weighed_amount\": 12.5,
    \"purity\": 99.0,
    \"target_concentration\": 1000,
    \"concentration_mode\": \"mg/L\",
    \"temperature_c\": 25.0,
    \"prepared_by\": \"Test User\",
    \"mix_code\": null,
    \"mix_code_show\": true,
    \"label_code\": null,
    \"label_code_source\": \"auto\"
  }" | jq

# 5. Save weighing and generate label
curl -s -X POST "https://labelpro-app.preview.emergentagent.com/api/weighing" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"compound_id\": \"$COMPOUND_ID\",
    \"weighed_amount\": 12.5,
    \"purity\": 99.0,
    \"target_concentration\": 1000,
    \"concentration_mode\": \"mg/L\",
    \"temperature_c\": 25.0,
    \"prepared_by\": \"Test User\",
    \"mix_code\": \"MIX-2025-001\",
    \"mix_code_show\": true,
    \"label_code\": null,
    \"label_code_source\": \"auto\"
  }" | jq
```

## Database Schema

### Usages Collection
```typescript
{
  id: string (UUID)
  compound_id: string
  compound_name: string
  cas_number: string
  weighed_amount: number  // mg
  purity: number  // %
  actual_mass: number  // mg
  target_concentration: number  // ppm
  concentration_mode: "mg/L" | "mg/kg"
  required_volume: number  // mL
  required_solvent_mass: number  // g
  actual_concentration: number  // ppm
  deviation: number  // %
  solvent: string
  temperature_c: number
  solvent_density: number  // g/mL
  remaining_stock: number
  remaining_stock_unit: string
  prepared_by: string
  mix_code?: string
  mix_code_show: boolean
  label_code_used?: string
  label_code_source: "auto" | "manual" | "excel"
  created_at: string (ISO 8601)
}
```

### Labels Collection
```typescript
{
  id: string (UUID)
  compound_id: string
  usage_id: string
  label_code: string
  compound_name: string
  cas_number: string
  concentration: string  // e.g., "1000.0 ppm"
  prepared_by: string
  date: string  // YYYY-MM-DD
  qr_data: string
  created_at: string (ISO 8601)
}
```

## Common Issues & Solutions

### Issue 1: 401 Unauthorized
**Cause:** Missing or expired token
**Solution:** Login again to get a fresh token

### Issue 2: 422 Validation Error
**Cause:** Missing required fields or invalid values
**Solution:** Check all required fields are present and valid

### Issue 3: 404 Compound Not Found
**Cause:** Invalid compound_id
**Solution:** Use fuzzy search to find valid compound IDs

### Issue 4: Mix code not appearing on label
**Cause:** `mix_code_show` is false
**Solution:** Set `mix_code_show: true`

### Issue 5: Label code not incrementing
**Cause:** Compound's `last_serial` not updating
**Solution:** Backend automatically handles this in transaction

## Browser DevTools Network Inspection

1. Open DevTools → Network tab
2. Look for POST request to `/api/weighing`
3. Check:
   - **Status:** Should be 200 OK
   - **Request Headers:** Content-Type: application/json
   - **Authorization:** Bearer token present
   - **Request Payload:** All required fields present
   - **Response:** Contains usage, label, qr_code, barcode

## Test Accounts

- **Admin Account**
  - Username: `admin`
  - Password: `admin123`
  - Role: admin

- **Test Account**
  - Username: `pestical`
  - Password: `aceta135410207`
  - Role: analyst
