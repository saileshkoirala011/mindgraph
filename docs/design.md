# MindGraph AI — Design Specification

| | |
|---|---|
| **Version** | 1.0 (Draft) |
| **Date** | October 27, 2026 |
| **Platform** | Mobile-first web application |

---

## 1. Design Principles
- Simple: large tap targets, minimal steps
- Honest: uncertain data is shown, never silently filled
- Bilingual: Nepali/English toggle on every screen
- Trustworthy: nothing is saved without owner approval

## 2. Screens
| Screen | Content |
|---|---|
| Upload | Take or choose a photo, or type transactions; language toggle |
| Confirmation | Editable table of extracted rows; low-confidence cells highlighted; page-total check; add/delete row; Save |
| Dashboard | Total owed, top owing customers, overdue list, spending breakdown, recent flags |
| Customer | Balance, transaction history, "Draft reminder" action |
| Reminder | Drafted message in Nepali or English with copy button |
| Ask | Question box; answer shown with the rows it used |

## 3. Behaviour
- Flags (total mismatch, duplicate) appear on the Confirmation screen before saving
- Empty states explain the next action
- Errors give a clear message and a manual-entry option

## 4. Visual Style
- High contrast, clean layout
- Readable Devanagari typeface
- One accent colour; red reserved for overdue and errors

## 5. Demo Script (3:00)
| Time | Segment |
|---|---|
| 0:00 | Problem in one sentence; show the paper ledger |
| 0:20 | Upload photo; show extraction and highlighted uncertain field |
| 0:50 | Correct one field; confirm and save |
| 1:20 | Dashboard refreshes; balances and a flag |
| 1:50 | Ask a question in Nepali, then English |
| 2:20 | Draft a payment reminder |
| 2:45 | Close: Meta models used; built for Nepali shop owners |

## 6. Open Items
- Final product name and logo
