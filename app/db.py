import sqlite3

DB_PATH = "mindgraph.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as c:
        c.executescript("""
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
