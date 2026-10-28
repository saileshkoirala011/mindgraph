"""
model_client.py
---------------
Provides a ModelClient abstraction with two implementations:

  StubClient      — returns hard-coded rows; used when META_API_KEY is not set.
  MetaApiClient   — calls muse-spark-1.2 via the OpenAI-compatible Meta API,
                    uses structured output (JSON schema) for reliable extraction.

Switch:  set META_API_KEY in your environment (or .env file) to activate the
         real client. The stub is used automatically when the key is absent.
"""

from __future__ import annotations

import base64
import io
import json
import logging
import os
from abc import ABC, abstractmethod
from typing import Any

log = logging.getLogger(__name__)

# ── Image pre-processing (Pillow) ─────────────────────────────────────────────
# Imported lazily so the app still starts without Pillow (unlikely, but safe).
def _preprocess_image(image_bytes: bytes) -> bytes:
    """
    Resize, rotate (EXIF-aware), and boost contrast before sending to the API.
    Returns JPEG bytes. Falls back to the original bytes if Pillow is missing.
    """
    try:
        from PIL import Image, ImageOps, ImageEnhance  # type: ignore

        img = Image.open(io.BytesIO(image_bytes))

        # Auto-rotate by EXIF orientation
        img = ImageOps.exif_transpose(img)

        # Convert to RGB (handles PNG/RGBA/P modes)
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize: keep within 1600 px on the long side (API sweet spot)
        max_side = 1600
        w, h = img.size
        if max(w, h) > max_side:
            scale = max_side / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

        # Boost contrast slightly — helps with handwriting
        img = ImageEnhance.Contrast(img).enhance(1.3)
        img = ImageEnhance.Sharpness(img).enhance(1.2)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=88)
        return buf.getvalue()

    except Exception as exc:
        log.warning("Image pre-processing skipped: %s", exc)
        return image_bytes


# ── Structured-output schema ──────────────────────────────────────────────────
# Sent as json_schema in the API call.  Pydantic is not required here — we
# build plain dicts so there's no extra import at startup.

EXTRACTION_SCHEMA: dict[str, Any] = {
    "name": "ledger_extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "required": ["page_total", "rows"],
        "additionalProperties": False,
        "properties": {
            "page_total": {
                "type": ["number", "null"],
                "description": (
                    "Sum of all monetary amounts on the page as written, "
                    "or null if not determinable."
                ),
            },
            "rows": {
                "type": "array",
                "items": {
                    "type": "object",
                    "required": ["date", "customer", "item", "amount", "kind", "confidence"],
                    "additionalProperties": False,
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "ISO 8601 date (YYYY-MM-DD). Use today if unclear.",
                        },
                        "customer": {
                            "type": "string",
                            "description": "Customer or party name as written.",
                        },
                        "item": {
                            "type": ["string", "null"],
                            "description": "Product or service description, or null.",
                        },
                        "amount": {
                            "type": "number",
                            "description": "Monetary amount (positive number, no currency symbol).",
                        },
                        "kind": {
                            "type": "string",
                            "enum": ["sale", "credit", "payment", "expense"],
                            "description": (
                                "sale=cash sale; credit=sold on credit / उधारो; "
                                "payment=customer paid their debt; expense=shop expense."
                            ),
                        },
                        "confidence": {
                            "type": "number",
                            "description": "Your confidence in this row 0.0–1.0.",
                        },
                    },
                },
            },
        },
    },
}

SYSTEM_PROMPT = """\
You are an expert bookkeeper reading handwritten shop ledger pages.
The ledger may be written in Nepali (Devanagari script), English, or a mix of both.
Extract every transaction row you can read.
For each row output: date (YYYY-MM-DD), customer name, item/description, amount \
(numeric, no currency symbol), kind (sale/credit/payment/expense), and your \
confidence (0.0–1.0) for the whole row.
Also output page_total: the sum of all amounts as written on the page.
If a field is illegible, make your best guess and lower the confidence score.
Do NOT skip rows.
"""


# ── Abstract base ─────────────────────────────────────────────────────────────

class ModelClient(ABC):
    @abstractmethod
    def extract(self, image_bytes: bytes | None, text: str | None) -> dict:
        """
        Returns:
            {
                "page_total": float | None,
                "rows": [
                    {
                        "date": str,
                        "customer": str,
                        "item": str | None,
                        "amount": float,
                        "kind": "sale"|"credit"|"payment"|"expense",
                        "confidence": float,
                    },
                    ...
                ],
            }
        """
        ...


# ── Stub client ───────────────────────────────────────────────────────────────

class StubClient(ModelClient):
    """
    Returns two hard-coded demo rows.
    Used when META_API_KEY is not set, so the full UI can be tested without a key.
    """

    def extract(self, image_bytes: bytes | None, text: str | None) -> dict:
        log.info("StubClient.extract called (no META_API_KEY set)")
        return {
            "page_total": 1500.0,
            "rows": [
                {
                    "date": "2026-10-20",
                    "customer": "Demo Customer A",
                    "item": "Face cream",
                    "amount": 800.0,
                    "kind": "credit",
                    "confidence": 0.9,
                },
                {
                    "date": "2026-10-21",
                    "customer": "Demo Customer B",
                    "item": "Lipstick",
                    "amount": 700.0,
                    "kind": "sale",
                    "confidence": 0.55,
                },
            ],
        }


# ── Meta API client ───────────────────────────────────────────────────────────

class MetaApiClient(ModelClient):
    """
    Calls muse-spark-1.2 via the OpenAI-compatible Meta API endpoint.
    Uses structured output (json_schema) so every response matches EXTRACTION_SCHEMA.
    Falls back to muse-spark-1.1 on model-not-found errors.
    """

    BASE_URL   = "https://api.meta.ai/v1"
    MODEL      = "muse-spark-1.2"
    FALLBACK   = "muse-spark-1.1"
    MAX_TOKENS = 2048

    def __init__(self, api_key: str):
        from openai import OpenAI  # type: ignore
        self._client = OpenAI(api_key=api_key, base_url=self.BASE_URL)

    def extract(self, image_bytes: bytes | None, text: str | None) -> dict:
        content: list[dict] = []

        if image_bytes:
            processed = _preprocess_image(image_bytes)
            b64 = base64.b64encode(processed).decode()
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            })

        user_text = text or "Extract all transaction rows from this ledger page."
        content.append({"type": "text", "text": user_text})

        for model in (self.MODEL, self.FALLBACK):
            try:
                response = self._client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": content},
                    ],
                    response_format={
                        "type": "json_schema",
                        "json_schema": EXTRACTION_SCHEMA,
                    },
                    max_tokens=self.MAX_TOKENS,
                    temperature=0.1,   # low temp = more consistent extraction
                )
                raw = response.choices[0].message.content
                log.info("MetaApiClient: model=%s tokens=%s",
                         model, response.usage.total_tokens if response.usage else "?")
                return self._parse(raw)

            except Exception as exc:
                err_str = str(exc).lower()
                # Try fallback model on "model not found" / "not supported" errors
                if model == self.MODEL and any(
                    kw in err_str for kw in ("model", "not found", "not supported", "invalid")
                ):
                    log.warning("muse-spark-1.2 failed (%s), retrying with %s", exc, self.FALLBACK)
                    continue
                # For all other errors, raise so the caller sees a clean HTTP 500
                raise

        raise RuntimeError("Both muse-spark-1.2 and muse-spark-1.1 failed.")

    @staticmethod
    def _parse(raw: str) -> dict:
        """Parse the model's JSON output and normalise field types."""
        try:
            data = json.loads(raw)
        except json.JSONDecodeError as exc:
            log.error("MetaApiClient: invalid JSON from model: %s", raw[:200])
            raise ValueError(f"Model returned invalid JSON: {exc}") from exc

        rows = []
        for r in data.get("rows", []):
            rows.append({
                "date":       str(r.get("date", "")),
                "customer":   str(r.get("customer", "")),
                "item":       r.get("item"),
                "amount":     float(r.get("amount", 0)),
                "kind":       r.get("kind", "sale"),
                "confidence": float(r.get("confidence", 0.5)),
            })

        return {
            "page_total": float(data["page_total"]) if data.get("page_total") else None,
            "rows": rows,
        }


# ── Customer name fuzzy-matching helper (rapidfuzz) ───────────────────────────

def suggest_customer_merge(name: str, existing_names: list[str], threshold: int = 85) -> str | None:
    """
    Returns the best matching existing customer name if similarity >= threshold,
    else None.  Used in the confirm UI to warn about probable duplicates.
    Example: "Sita Rai" and "Seeta Rai" → suggests merging.
    """
    try:
        from rapidfuzz import process, fuzz  # type: ignore
        match = process.extractOne(name, existing_names, scorer=fuzz.token_sort_ratio)
        if match and match[1] >= threshold:
            return match[0]
    except Exception:
        pass
    return None


# ── Factory ───────────────────────────────────────────────────────────────────

def get_client() -> ModelClient:
    """
    Returns MetaApiClient if META_API_KEY is set, otherwise StubClient.
    Loads .env automatically (requires python-dotenv, already installed).
    """
    try:
        from dotenv import load_dotenv  # type: ignore
        load_dotenv()
    except ImportError:
        pass

    key = os.environ.get("META_API_KEY", "").strip()
    if key:
        log.info("Using MetaApiClient (muse-spark-1.2)")
        return MetaApiClient(api_key=key)

    log.info("META_API_KEY not set — using StubClient")
    return StubClient()
