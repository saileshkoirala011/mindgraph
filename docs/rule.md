# MindGraph AI — Project Rules

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | October 27, 2026 |
| **Applies to** | All contributors and AI coding assistants |

---

## 1. Hackathon Compliance
1. Use Meta models only: Muse Spark, Muse Image, Muse Wonder, Muse Voice Transcribe, SAM 3.1, Muse Glimmer, Muse Spark Open.
2. The repository is public.
3. Everything demonstrated is built during Oct 26 – Nov 4, 2026. No reused code from earlier projects.
4. Avoid banned idea categories (basic RAG, simple image analyzers, etc.).

## 2. Product Rules
1. Never save extracted data without owner confirmation.
2. Never guess a missing date, amount or name; ask the owner.
3. Display low-confidence fields visibly.
4. Answers use stored data only. If the data cannot answer, say so.
5. Reminders are drafts and are never sent automatically.

## 3. Data Rules
1. All demo data is fictional and clearly labeled.
2. No real customer data in the repository.
3. An anonymized real ledger is used only with the owner's permission.

## 4. Engineering Rules
1. Small, runnable increments; one feature per commit with a clear message.
2. Secrets live in `.env`; `.env` is in `.gitignore`.
3. All model calls go through `ModelClient`.
4. Every model call has a timeout and error handling.
5. UTF-8 for all text, including Devanagari.

## 5. Scope Rules
1. A working demo takes priority over extra features.
2. If a day slips, cut from the "Should Have" list first.
3. Feature freeze on Nov 3. Nov 4 is for buffer and submission only.
