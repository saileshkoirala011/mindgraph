# MindGraph AI — Product Requirements Document

| | |
|---|---|
| **Version** | 1.0 (Draft) |
| **Date** | October 27, 2026 |
| **Owner** | Sailesh |
| **Event** | Meta Global AI Developer Hackathon (Oct 26 – Nov 4, 2026) |
| **Track** | Indie Developer · "Build for Your World" |
| **Submission deadline** | Nov 4, 2026, 9:00 PM ET (Nov 5, 7:45 AM Nepal Time) |
| **Status** | Draft. Open questions listed in Section 10 |

---

## 1. Executive Summary
MindGraph AI turns photographs of handwritten shop ledgers into structured, owner-verified financial records. It tracks customer credit, flags errors, and drafts payment reminders, in Nepali and English, using Meta models.

## 2. Problem Statement
Cosmetics shop owners in Nepal record sales, expenses and customer credit in handwritten ledgers and paper bills. As a result:
- Totals are error-prone and rarely re-checked
- Overdue customer credit is forgotten or chased inconsistently
- Owners have no visibility into where money is spent
- Conventional accounting software is too heavy for daily use

## 3. Target User
**Primary:** Owner of a small cosmetics shop in Nepal.
- Writes in Nepali, English, or a mix of both
- Works primarily from a smartphone
- Has little time or tolerance for setup

## 4. Goals and Non-Goals
**Goals**
- Convert a ledger photo into verified transactions in minutes
- Make money owed by each customer instantly visible
- Reduce errors through automated checks and owner confirmation
- Produce ready-to-use payment reminders

**Non-Goals (MVP)**
- Multi-shop or multi-user accounts, authentication
- Automatic sending of SMS or WhatsApp messages
- Native mobile application
- Full accounting (tax, inventory, payroll)

## 5. Core Feature
Photo or text input → AI extraction → owner confirmation → stored records → credit tracking, insights and reminders.

## 6. Functional Requirements

### 6.1 Must Have (MVP)
| ID | Requirement |
|---|---|
| F1 | Upload a ledger or receipt image, or type transactions in Nepali or English |
| F2 | Extract date, customer, item, amount and paid/credit status using a Meta vision model |
| F3 | Show a confirmation screen; nothing is saved until the owner approves |
| F4 | Store confirmed transactions in SQLite |
| F5 | Flag mismatched totals and duplicate entries |
| F6 | Compute money owed per customer and list overdue accounts |
| F7 | Draft a payment reminder per customer in Nepali or English |
| F8 | Dashboard: total owed, top owing customers, spending breakdown |
| F9 | Answer questions in Nepali or English using stored data only |

### 6.2 Should Have (if time permits)
- PDF upload
- Voice input via Muse Voice Transcribe

## 7. Non-Functional Requirements
- Mobile-friendly web interface
- Full Unicode support for Devanagari
- Model calls handle timeouts and errors gracefully
- API keys stored outside source control

## 8. Edge Cases
| Case | Expected behaviour |
|---|---|
| Illegible or cropped handwriting | Mark field low-confidence and ask the owner |
| Mixed Nepali/English; Devanagari vs Roman numerals | Normalize numbers; owner confirms |
| Page total differs from sum of lines | Flag before saving |
| Same page uploaded twice | Duplicate flag |
| Same customer spelled differently | Suggest merge; owner decides |
| Missing date | Ask; never guess |
| Partial payment on credit | Reduce balance; keep history |
| Zero or negative amounts, crossed-out corrections | Flag for review |
| Model failure or rate limit | Fallback model or manual entry |
| Question the data cannot answer | State that clearly; do not invent |

## 9. MVP Scope and Demo
**In scope:** F1–F9.
**Demo (3 minutes):** process a ledger photo → confirm extracted transactions → dashboard refreshes → ask a question in Nepali or English → show a customer payment reminder.
All demo data is clearly labeled fictional. An anonymized real example is used only with the owner's permission.

## 10. Open Questions
| # | Question | Owner |
|---|---|---|
| 1 | Does Muse Spark accept image input via the API? | Sailesh |
| 2 | Is Meta Model API access approved? | Sailesh |
| 3 | Does the hackathon require FalkorDB? | Sailesh |
| 4 | Default overdue threshold (proposed: 30 days, configurable) | Sailesh |
| 5 | Reminders drafted only, or also sent (proposed: drafted only) | Sailesh |
| 6 | Final product name | Sailesh |

## 11. Judging Alignment
| Criterion | Weight | How MindGraph AI addresses it |
|---|---|---|
| Impact | 30% | Real, local problem for small shop owners in Nepal |
| Demo | 25% | Clear end-to-end flow in 3 minutes |
| Meta tooling | 25% | Meta vision and language models at the core |
| Technical depth | 20% | Extraction pipeline, validation checks, bilingual Q&A |
