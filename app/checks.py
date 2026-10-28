"""
Business-logic checks run before saving transactions.
Each function returns a list of issue dicts:
  {"row": <int>, "field": <str>, "code": <str>, "message": <str>}
An empty list means no issues.
"""

from .db import get_conn


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------

def check_duplicates(rows: list[dict]) -> list[dict]:
    """
    Flag a row if a transaction with the same (date, customer, amount, kind)
    already exists in the DB, or appears more than once in the incoming batch.
    """
    issues = []
    seen: set[tuple] = set()

    with get_conn() as conn:
        for i, row in enumerate(rows):
            key = (
                row.get("date", ""),
                (row.get("customer") or "").strip().lower(),
                row.get("amount", 0),
                row.get("kind", ""),
            )

            # Duplicate within the batch itself
            if key in seen:
                issues.append({
                    "row": i,
                    "field": "amount",
                    "code": "DUPLICATE_IN_BATCH",
                    "message": "This row is an exact duplicate of another row in this upload.",
                })
                continue
            seen.add(key)

            # Duplicate against existing DB records
            cur = conn.execute(
                """
                SELECT t.id FROM transactions t
                JOIN customers c ON c.id = t.customer_id
                WHERE t.date = ? AND lower(c.name) = ? AND t.amount = ? AND t.kind = ?
                LIMIT 1
                """,
                (key[0], key[1], key[2], key[3]),
            )
            if cur.fetchone():
                issues.append({
                    "row": i,
                    "field": "amount",
                    "code": "DUPLICATE_IN_DB",
                    "message": "A transaction with the same date, customer, amount, and kind already exists.",
                })

    return issues


# ---------------------------------------------------------------------------
# Total mismatch
# ---------------------------------------------------------------------------

def check_total_mismatch(rows: list[dict], page_total: float | None) -> list[dict]:
    """
    The model returns a page_total (sum of all amounts on the page as read).
    If our parsed row totals differ by more than 1 %, flag it.
    Skips the check when page_total is None or 0.
    """
    if not page_total:
        return []

    row_sum = sum(float(r.get("amount", 0)) for r in rows)
    diff_pct = abs(row_sum - page_total) / page_total

    if diff_pct > 0.01:
        return [{
            "row": -1,          # -1 means the whole upload, not a specific row
            "field": "amount",
            "code": "TOTAL_MISMATCH",
            "message": (
                f"Row totals ({row_sum:.2f}) differ from the page total "
                f"({page_total:.2f}) by {diff_pct * 100:.1f} %. "
                "Review the amounts before saving."
            ),
        }]
    return []


# ---------------------------------------------------------------------------
# Low-confidence rows
# ---------------------------------------------------------------------------

CONFIDENCE_THRESHOLD = 0.7

def low_confidence_fields(row: dict) -> list[str]:
    """Return list of field names whose per-field confidence is below threshold."""
    flagged = []
    conf = row.get("confidence", 1.0)
    # If confidence is a single scalar, apply it to the whole row
    if isinstance(conf, (int, float)) and conf < CONFIDENCE_THRESHOLD:
        flagged = ["date", "customer", "item", "amount", "kind"]
    elif isinstance(conf, dict):
        for field, val in conf.items():
            if val < CONFIDENCE_THRESHOLD:
                flagged.append(field)
    return flagged


# ---------------------------------------------------------------------------
# Run all checks at once
# ---------------------------------------------------------------------------

def run_all_checks(rows: list[dict], page_total: float | None) -> list[dict]:
    issues = []
    issues.extend(check_duplicates(rows))
    issues.extend(check_total_mismatch(rows, page_total))
    return issues
