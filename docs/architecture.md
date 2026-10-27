# MindGraph AI — Technical Architecture

| | |
|---|---|
| **Version** | 1.0 (Draft) |
| **Date** | October 27, 2026 |
| **Status** | Proposed. Model and API details unconfirmed until the first Meta API test succeeds |

---

## 1. Overview
A small web application: FastAPI backend, SQLite storage, a mobile-friendly front end, and Meta models accessed through one abstraction layer.

## 2. Technology Stack
| Layer | Choice | Notes |
|---|---|---|
| Backend | Python, FastAPI | |
| Database | SQLite | FalkorDB only if hackathon rules require it |
| Frontend | HTML/JavaScript, served by FastAPI | Mobile-first |
| AI | Meta models via Meta Model API | Open-weights backup, still a Meta model |
| Config | `.env` | Never committed |

## 3. System Flow
```
Photo / typed text
  → POST /api/extract        ModelClient.extract → draft rows + confidence
  → Confirmation screen      owner edits and approves
  → POST /api/transactions   validate, duplicate check, save
  → Automated checks         total mismatch, duplicates, overdue
  → Dashboard · Ask · Reminders
```

## 4. Model Abstraction
All model calls go through one interface so the model can be swapped without changing the app.

| Method | Purpose |
|---|---|
| `extract(image_or_text)` | Returns draft transactions with per-field confidence |
| `answer(question, rows)` | Answers in Nepali or English from stored data |
| `draft_reminder(customer, balance, language)` | Produces a payment reminder |

Implementations: `MetaApiClient` (primary) and `OpenWeightsClient` (backup).

## 5. Data Model (draft)
| Table | Fields |
|---|---|
| customers | id, name, aliases |
| transactions | id, customer_id, date, item, amount, kind (sale / credit / payment / expense), source_upload_id, confirmed, created_at |
| uploads | id, filename, hash, page_total, created_at |
| reminders | id, customer_id, language, text, created_at |

## 6. API Endpoints (draft)
| Method | Path | Purpose |
|---|---|---|
| POST | /api/extract | Extract draft transactions |
| POST | /api/transactions | Save confirmed transactions |
| GET | /api/customers | List customers and balances |
| GET | /api/customers/{id} | Customer detail |
| GET | /api/dashboard | Dashboard data |
| POST | /api/ask | Question answering |
| POST | /api/reminders | Draft a reminder |

## 7. Validation Rules
- **Total mismatch:** sum of lines differs from page total
- **Duplicate:** same upload hash, or same customer + date + amount + item
- **Overdue:** unpaid credit older than the configured threshold

## 8. Security and Reliability
- API keys in `.env`; `.env` listed in `.gitignore`
- Timeout and error handling on every model call
- Fallback to manual entry if extraction fails
- UTF-8 end to end

## 9. Open Items
- Exact model name, endpoint and image input format
- Whether Nepali handwriting needs image pre-processing
