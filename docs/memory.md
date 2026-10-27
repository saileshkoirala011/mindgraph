# MindGraph AI — Project Memory

Living status document for the builder and any AI assistant. Update at the end of every work session.

| | |
|---|---|
| **Last updated** | October 27, 2026 |
| **Builder** | Sailesh (solo), Pokhara, Nepal |
| **Event** | Meta Global AI Developer Hackathon · Indie Developer · "Build for Your World" |
| **Deadline** | Nov 4, 2026, 9:00 PM ET (Nov 5, 7:45 AM Nepal Time) |
| **Capacity** | 4–6 hours per day |

---

## 1. Project Summary
MindGraph AI converts photos of handwritten ledgers into verified transaction records for cosmetics shop owners in Nepal, tracks customer credit, flags errors and drafts payment reminders in Nepali and English.

## 2. Decisions
| Decision | Detail |
|---|---|
| Database | SQLite; FalkorDB only if rules require it |
| AI layer | Meta model behind `ModelClient`, with open-weights backup |
| Data integrity | Owner confirms every extraction before saving |
| Reminders | Drafted only, not sent |
| Demo data | Fictional and labeled; anonymized real sample only with permission |

## 3. Open Questions
- Meta API access and key status
- Does Muse Spark accept images and read Nepali handwriting?
- Does the hackathon require FalkorDB?
- Default overdue threshold
- Final product name

## 4. Action Items
- [ ] Change application track to Indie Developer and correct funding/incorporation answers
- [ ] Secure Meta Model API access
- [ ] Create public repository
- [ ] Prepare three handwritten fictional ledger test images (Nepali, English, mixed)
- [ ] Run first image extraction test

## 5. Progress Log
| Date | Update |
|---|---|
| 2026-10-26 | PRD drafted; project documents created |
| 2026-10-27 | Documents reformatted for professional presentation |
