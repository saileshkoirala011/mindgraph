import hashlib
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .db import init_db, get_conn
from .model_client import get_client
from .checks import run_all_checks, low_confidence_fields

app = FastAPI(title="MindGraph AI")

STATIC_DIR = Path(__file__).parent / "static"


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

@app.on_event("startup")
def startup():
    init_db()
    STATIC_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}


# ---------------------------------------------------------------------------
# /api/extract  – upload image or text, get back rows + checks
# ---------------------------------------------------------------------------

@app.post("/api/extract")
async def extract(
    image: UploadFile | None = File(None),
    text: str | None = Form(None),
):
    raw = await image.read() if image else None
    filename = image.filename if image else None
    file_hash = hashlib.sha256(raw).hexdigest() if raw else None

    result = get_client().extract(raw, text)
    rows = result.get("rows", [])
    page_total = result.get("page_total")

    # Annotate each row with its low-confidence fields
    for row in rows:
        row["low_confidence_fields"] = low_confidence_fields(row)

    # Run checks (duplicates + total mismatch)
    issues = run_all_checks(rows, page_total)

    return {
        "filename": filename,
        "file_hash": file_hash,
        "page_total": page_total,
        "rows": rows,
        "issues": issues,
    }


# ---------------------------------------------------------------------------
# /api/transactions  – save confirmed rows to SQLite
# ---------------------------------------------------------------------------

class TransactionRow(BaseModel):
    date: str
    customer: str
    item: str | None = None
    amount: float
    kind: str  # sale | credit | payment | expense


class SaveRequest(BaseModel):
    filename: str | None = None
    file_hash: str | None = None
    page_total: float | None = None
    rows: list[TransactionRow]
    force: bool = False   # True = user acknowledged issues and still wants to save


@app.post("/api/transactions")
def save_transactions(body: SaveRequest):
    rows_as_dicts = [r.model_dump() for r in body.rows]

    # Re-run checks unless user is forcing through
    issues = [] if body.force else run_all_checks(rows_as_dicts, body.page_total)

    blocking = [i for i in issues if i["code"] in ("DUPLICATE_IN_DB", "DUPLICATE_IN_BATCH")]
    warnings = [i for i in issues if i not in blocking]

    if blocking:
        raise HTTPException(
            status_code=409,
            detail={"message": "Blocking issues found. Fix them or set force=true.", "issues": blocking},
        )

    saved_ids = []

    with get_conn() as conn:
        # Register the upload (idempotent on hash)
        upload_id = None
        if body.file_hash:
            conn.execute(
                "INSERT OR IGNORE INTO uploads (filename, hash, page_total) VALUES (?, ?, ?)",
                (body.filename, body.file_hash, body.page_total),
            )
            row = conn.execute(
                "SELECT id FROM uploads WHERE hash = ?", (body.file_hash,)
            ).fetchone()
            upload_id = row["id"] if row else None

        for r in body.rows:
            # Upsert customer
            conn.execute(
                "INSERT OR IGNORE INTO customers (name) VALUES (?)",
                (r.customer.strip(),),
            )
            cust = conn.execute(
                "SELECT id FROM customers WHERE lower(name) = lower(?)",
                (r.customer.strip(),),
            ).fetchone()
            customer_id = cust["id"]

            cur = conn.execute(
                """
                INSERT INTO transactions (customer_id, date, item, amount, kind, upload_id)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (customer_id, r.date, r.item, r.amount, r.kind, upload_id),
            )
            saved_ids.append(cur.lastrowid)

    return {
        "saved": len(saved_ids),
        "ids": saved_ids,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# /api/transactions  – list recent (simple ledger read)
# ---------------------------------------------------------------------------

@app.get("/api/transactions")
def list_transactions(limit: int = 100):
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT t.id, c.name AS customer, t.date, t.item, t.amount, t.kind, t.created_at
            FROM transactions t
            LEFT JOIN customers c ON c.id = t.customer_id
            ORDER BY t.created_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


# ---------------------------------------------------------------------------
# Static files — mount AFTER API routes
# ---------------------------------------------------------------------------

app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
