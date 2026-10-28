"""
Unit tests for app/checks.py.
Run with: .venv/Scripts/pytest tests/test_checks.py -v
"""
import sqlite3
import pytest
import sys
import os

# Make sure we can import the app package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import app.db as db_module
from app.checks import check_total_mismatch, check_duplicates, run_all_checks

# ── Use a single shared in-memory connection per test ─────────────────────
# SQLite :memory: databases are per-connection, so we patch get_conn() to
# always return the same connection that was initialised by init_db().

@pytest.fixture(autouse=True)
def fresh_db(monkeypatch):
    """Create a fresh in-memory DB and patch get_conn() to use it."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row

    # Run the schema creation on this connection
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, aliases TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS uploads (
        id INTEGER PRIMARY KEY, filename TEXT, hash TEXT UNIQUE,
        page_total REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        date TEXT, item TEXT, amount REAL NOT NULL,
        kind TEXT CHECK(kind IN ('sale','credit','payment','expense')),
        upload_id INTEGER REFERENCES uploads(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id),
        language TEXT, text TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Patch get_conn in every module that imported it
    monkeypatch.setattr(db_module, "get_conn", lambda: conn)

    import app.checks as checks_module
    monkeypatch.setattr(checks_module, "get_conn", lambda: conn)

    yield conn
    conn.close()


# ── Total mismatch ────────────────────────────────────────────────────────

def make_row(amount, kind="sale"):
    return {"date": "2026-10-01", "customer": "Test Co", "item": "x",
            "amount": amount, "kind": kind}


def test_no_mismatch_when_totals_match():
    rows = [make_row(500), make_row(500)]
    assert check_total_mismatch(rows, 1000.0) == []


def test_no_mismatch_within_1pct():
    rows = [make_row(999)]
    assert check_total_mismatch(rows, 1000.0) == []


def test_mismatch_detected():
    rows = [make_row(800)]
    issues = check_total_mismatch(rows, 1000.0)
    assert len(issues) == 1
    assert issues[0]["code"] == "TOTAL_MISMATCH"
    assert issues[0]["row"] == -1


def test_no_check_when_page_total_none():
    assert check_total_mismatch([make_row(1)], None) == []


def test_no_check_when_page_total_zero():
    assert check_total_mismatch([make_row(1)], 0) == []


# ── Duplicate detection ───────────────────────────────────────────────────

def test_no_duplicates_in_empty_db():
    rows = [make_row(100), make_row(200)]
    assert check_duplicates(rows) == []


def test_batch_duplicate_flagged():
    row = make_row(100)
    issues = check_duplicates([row, row])
    assert any(i["code"] == "DUPLICATE_IN_BATCH" for i in issues)


def test_db_duplicate_flagged(fresh_db):
    conn = fresh_db
    conn.execute("INSERT INTO customers (name) VALUES ('Test Co')")
    cust_id = conn.execute("SELECT id FROM customers WHERE name='Test Co'").fetchone()["id"]
    conn.execute(
        "INSERT INTO transactions (customer_id, date, item, amount, kind) VALUES (?,?,?,?,?)",
        (cust_id, "2026-10-01", "x", 100.0, "sale"),
    )
    conn.commit()
    issues = check_duplicates([make_row(100)])
    assert any(i["code"] == "DUPLICATE_IN_DB" for i in issues)


# ── run_all_checks ────────────────────────────────────────────────────────

def test_run_all_clean():
    # Two rows with different amounts — no duplicates, totals match exactly.
    assert run_all_checks([make_row(400), make_row(600)], 1000.0) == []
