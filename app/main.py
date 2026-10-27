from fastapi import FastAPI, UploadFile, File, Form
from .db import init_db
from .model_client import get_client

app = FastAPI(title="MindGraph AI")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/extract")
async def extract(
    image: UploadFile | None = File(None),
    text: str | None = Form(None),
):
    data = await image.read() if image else None
    return get_client().extract(data, text)
