# MindGraph AI — Delivery Plan

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | October 27, 2026 |
| **Capacity** | 4–6 hours per day |
| **Deadline** | Nov 4, 2026, 9:00 PM ET (Nov 5, 7:45 AM Nepal Time) |

---

## 1. Phases
| Phase | Dates | Objective | Exit criteria |
|---|---|---|---|
| 0. Setup | Oct 26–27 | Fix application (Indie Developer), secure Meta API access, create public repo | One image sent to a Meta model; response received |
| 1. Extraction | Oct 28–29 | Schema, extract endpoint, confirmation screen | A fictional ledger photo becomes editable rows |
| 2. Core data | Oct 30–31 | Save, balances, error flags, dashboard | Dashboard updates after confirmation; flags display |
| 3. Actions | Nov 1 | Payment reminders, bilingual Q&A | Reminder and Nepali/English answer work on demo data |
| 4. Testing | Nov 2 | Test three handwritten fictional ledgers (Nepali, English, mixed); fix accuracy | Demo path succeeds three consecutive runs |
| 5. Release prep | Nov 3 | Record 3-minute demo, write README, feature freeze | Video and README complete |
| 6. Submission | Nov 4 | Buffer and early submission | Submitted before deadline |

## 2. Scope Cut Order
1. Voice input
2. PDF upload
3. Spending breakdown chart
4. Duplicate-customer merge suggestion

## 3. Risk Register
| Risk | Impact | Mitigation |
|---|---|---|
| Meta API access not secured | Blocks all AI work | Resolve in Phase 0; prepare open-weights backup |
| Nepali handwriting accuracy | Poor extraction | Owner confirmation screen; test set; image pre-processing if needed |
| Image input unsupported by chosen model | Pipeline change | Test early; switch model behind `ModelClient` |
| Time shortfall | Incomplete demo | Cut list above; feature freeze Nov 3 |
