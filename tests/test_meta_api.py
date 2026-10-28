"""
Quick smoke-test for the Meta API.
Run AFTER you have a key and at least one test image:

    $env:META_API_KEY = "your_key_here"
    .\.venv\Scripts\python.exe tests/test_meta_api.py tests/ledgers/english.jpg

Prints the raw model response and the parsed extraction result.
If it errors, paste the full traceback and error message back to Kiro.
"""

import os
import sys
import base64
import json

# ── 1. Check key ─────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

api_key = os.environ.get("META_API_KEY", "").strip()
if not api_key:
    print("ERROR: META_API_KEY is not set.")
    print("  Set it:  $env:META_API_KEY = 'your_key_here'")
    print("  Or add it to a .env file in the project root.")
    sys.exit(1)

# ── 2. Find image ─────────────────────────────────────────────────────────────
image_path = sys.argv[1] if len(sys.argv) > 1 else "tests/ledgers/english.jpg"
if not os.path.exists(image_path):
    print(f"ERROR: image not found at '{image_path}'")
    print("  Usage: python tests/test_meta_api.py <path-to-image>")
    sys.exit(1)

print(f"Image:   {image_path}  ({os.path.getsize(image_path):,} bytes)")
print(f"Key:     {api_key[:8]}…")
print()

# ── 3. Raw call (mirrors what MetaApiClient does) ─────────────────────────────
from openai import OpenAI

client = OpenAI(api_key=api_key, base_url="https://api.meta.ai/v1")

raw_bytes = open(image_path, "rb").read()
img_b64   = base64.b64encode(raw_bytes).decode()

print("Calling muse-spark-1.2 …")
try:
    r = client.chat.completions.create(
        model="muse-spark-1.2",
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": (
                        "Read this handwritten shop ledger page. "
                        "Return every transaction row as JSON with fields: "
                        "date (YYYY-MM-DD), customer, item, amount (number), "
                        "kind (sale/credit/payment/expense), confidence (0-1). "
                        "Also include page_total (sum of all amounts)."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"},
                },
            ],
        }],
        max_tokens=1024,
    )
    print("── RAW RESPONSE ────────────────────────────────────")
    print(r.choices[0].message.content)
    print("────────────────────────────────────────────────────")
    if r.usage:
        print(f"Tokens: prompt={r.usage.prompt_tokens}  "
              f"completion={r.usage.completion_tokens}  "
              f"total={r.usage.total_tokens}")

except Exception as exc:
    print(f"\n❌  API ERROR: {type(exc).__name__}: {exc}")
    print("\nPaste this entire output back to Kiro.")
    sys.exit(1)

# ── 4. Test through MetaApiClient (full structured path) ─────────────────────
print("\nTesting MetaApiClient.extract() …")
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from app.model_client import MetaApiClient

mc = MetaApiClient(api_key=api_key)
try:
    result = mc.extract(raw_bytes, None)
    print(f"page_total: {result['page_total']}")
    print(f"rows extracted: {len(result['rows'])}")
    for i, row in enumerate(result["rows"], 1):
        print(f"  {i}. {row['date']}  {row['customer']:<20}  "
              f"{row['amount']:>10.2f}  {row['kind']:<10}  conf={row['confidence']:.2f}")
    print("\n✓  MetaApiClient works.")
except Exception as exc:
    print(f"\n❌  MetaApiClient ERROR: {type(exc).__name__}: {exc}")
    print("Paste this entire output back to Kiro.")
    sys.exit(1)
