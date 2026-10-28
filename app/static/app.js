/* ══════════════════════════════════════════════════════════════════
   MindGraph AI  —  app.js
   Single-page controller: Overview · Transactions · Add Entry
   ══════════════════════════════════════════════════════════════════ */

// ── i18n ─────────────────────────────────────────────────────────────────────
let LANG = localStorage.getItem("mg_lang") || "en";

const I18N = {
  en: {
    income:       "Income",
    expenses:     "Expenses",
    credit:       "Outstanding Credit",
    net:          "Net Balance",
    tx:           "Transactions",
    customers:    "Customers",
    npr:          "NPR",
    no_tx:        "No transactions yet.",
    saved_ok:     (n) => `${n} transaction${n !== 1 ? "s" : ""} saved.`,
    save_err:     "Save failed — fix issues and retry.",
    extract_err:  "Extraction failed.",
    required:     "Please fill in all required fields.",
    kind_sale:    "Sale",
    kind_credit:  "Credit",
    kind_payment: "Payment",
    kind_expense: "Expense",
  },
  np: {
    income:       "आम्दानी",
    expenses:     "खर्च",
    credit:       "बाँकी उधारो",
    net:          "खुद मौज्दात",
    tx:           "कारोबारहरू",
    customers:    "ग्राहकहरू",
    npr:          "रु",
    no_tx:        "अहिलेसम्म कुनै कारोबार छैन।",
    saved_ok:     (n) => `${n} कारोबार सुरक्षित गरियो।`,
    save_err:     "सुरक्षित गर्न सकिएन — समस्याहरू ठीक गर्नुहोस्।",
    extract_err:  "निकासी असफल।",
    required:     "कृपया सबै आवश्यक फिल्डहरू भर्नुहोस्।",
    kind_sale:    "बिक्री",
    kind_credit:  "उधारो",
    kind_payment: "भुक्तानी",
    kind_expense: "खर्च",
  },
};

function t(key, ...args) {
  const v = I18N[LANG]?.[key] ?? I18N.en[key] ?? key;
  return typeof v === "function" ? v(...args) : v;
}

function setLang(lang) {
  LANG = lang;
  localStorage.setItem("mg_lang", lang);
  document.getElementById("lang-en").classList.toggle("active", lang === "en");
  document.getElementById("lang-np").classList.toggle("active", lang === "np");
  applyLangToDOM();
  // Re-render live sections
  if (!document.getElementById("overview").hidden)  loadOverview();
  if (!document.getElementById("transactions").hidden) loadTransactions();
}

function applyLangToDOM() {
  // Elements with data-en / data-np text content
  document.querySelectorAll("[data-en]").forEach(el => {
    const val = el.getAttribute(`data-${LANG}`) || el.getAttribute("data-en");
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return; // handled below
    if (!el.children.length) el.textContent = val;
  });
  // Placeholders
  document.querySelectorAll("[data-placeholder-en]").forEach(el => {
    el.placeholder = el.getAttribute(`data-placeholder-${LANG}`) || el.getAttribute("data-placeholder-en");
  });
  // Select options
  document.querySelectorAll("select option[data-en]").forEach(opt => {
    opt.textContent = opt.getAttribute(`data-${LANG}`) || opt.getAttribute("data-en");
  });
}

// ── Navigation ────────────────────────────────────────────────────────────────
const SECTIONS = ["overview", "transactions", "add"];

function showSection(id) {
  SECTIONS.forEach(s => {
    document.getElementById(s).hidden = (s !== id);
  });
  document.querySelectorAll(".nav-link").forEach(a => {
    a.classList.toggle("active", a.dataset.section === id);
  });
  if (id === "overview")     loadOverview();
  if (id === "transactions") loadTransactions();
}

document.querySelectorAll(".nav-link").forEach(a => {
  a.addEventListener("click", e => {
    e.preventDefault();
    showSection(a.dataset.section);
    history.pushState({}, "", a.getAttribute("href"));
  });
});

window.addEventListener("popstate", () => {
  const hash = location.hash.replace("#", "") || "overview";
  if (SECTIONS.includes(hash)) showSection(hash);
});

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ""; }, 3600);
}

// ── Currency formatter ────────────────────────────────────────────────────────
function fmt(n) {
  return (LANG === "np" ? "रु " : "NPR ") +
    Number(n).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Kind badge HTML ───────────────────────────────────────────────────────────
function kindBadge(kind) {
  const label = t(`kind_${kind}`) || kind;
  return `<span class="kind-badge kind-${kind}">${label}</span>`;
}

function amtClass(kind) {
  return { sale: "amt-income", credit: "amt-credit", payment: "amt-payment", expense: "amt-expense" }[kind] || "";
}

// ══════════════════════════════════════════════════════════════════
//  OVERVIEW
// ══════════════════════════════════════════════════════════════════

async function loadOverview() {
  // Stats
  try {
    const s = await fetch("/api/summary").then(r => r.json());
    document.getElementById("stats-grid").innerHTML = `
      <div class="stat-card income">
        <div class="label">${t("income")}</div>
        <div class="value">${fmt(s.income)}</div>
        <div class="sub">${t("npr")}</div>
      </div>
      <div class="stat-card expenses">
        <div class="label">${t("expenses")}</div>
        <div class="value">${fmt(s.expenses)}</div>
        <div class="sub">${t("npr")}</div>
      </div>
      <div class="stat-card credit">
        <div class="label">${t("credit")}</div>
        <div class="value">${fmt(s.credit)}</div>
        <div class="sub">${t("npr")}</div>
      </div>
      <div class="stat-card net">
        <div class="label">${t("net")}</div>
        <div class="value">${fmt(s.net)}</div>
        <div class="sub">${s.tx_count} ${t("tx")} · ${s.cust_count} ${t("customers")}</div>
      </div>`;
  } catch {
    document.getElementById("stats-grid").innerHTML =
      `<div class="empty-state">Could not load summary.</div>`;
  }

  // Recent 10
  try {
    const rows = await fetch("/api/transactions?limit=10").then(r => r.json());
    const el = document.getElementById("recent-list");
    if (!rows.length) { el.innerHTML = `<div class="empty-state">${t("no_tx")}</div>`; return; }
    el.innerHTML = `
      <div class="table-wrap">
      <table>
        <thead><tr>
          <th data-en="Date" data-np="मिति">${LANG === "np" ? "मिति" : "Date"}</th>
          <th data-en="Customer" data-np="ग्राहक">${LANG === "np" ? "ग्राहक" : "Customer"}</th>
          <th data-en="Amount" data-np="रकम">${LANG === "np" ? "रकम" : "Amount"} (रु)</th>
          <th data-en="Type" data-np="प्रकार">${LANG === "np" ? "प्रकार" : "Type"}</th>
        </tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td>${r.date || ""}</td>
            <td>${esc(r.customer || "")}</td>
            <td class="amt ${amtClass(r.kind)}">${fmt(r.amount)}</td>
            <td>${kindBadge(r.kind)}</td>
          </tr>`).join("")}
        </tbody>
      </table></div>`;
  } catch {
    document.getElementById("recent-list").innerHTML =
      `<div class="empty-state">Could not load recent transactions.</div>`;
  }
}

// ══════════════════════════════════════════════════════════════════
//  TRANSACTIONS  (searchable ledger)
// ══════════════════════════════════════════════════════════════════

let txDebounce;
document.getElementById("tx-search").addEventListener("input", () => {
  clearTimeout(txDebounce);
  txDebounce = setTimeout(loadTransactions, 280);
});
document.getElementById("tx-kind-filter").addEventListener("change", loadTransactions);

async function loadTransactions() {
  const q    = document.getElementById("tx-search").value.trim();
  const kind = document.getElementById("tx-kind-filter").value;
  const params = new URLSearchParams({ limit: 500 });
  if (q)    params.set("q", q);
  if (kind) params.set("kind", kind);

  const tbody = document.getElementById("tx-body");
  tbody.innerHTML = `<tr><td colspan="5" class="empty-state"><span class="spinner spinner-dark"></span></td></tr>`;

  try {
    const rows = await fetch("/api/transactions?" + params).then(r => r.json());
    document.getElementById("tx-count").textContent =
      rows.length ? `${rows.length} ${t("tx")}` : "";

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${t("no_tx")}</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>${r.date || ""}</td>
        <td>${esc(r.customer || "")}</td>
        <td>${esc(r.item || "—")}</td>
        <td class="amt ${amtClass(r.kind)}">${fmt(r.amount)}</td>
        <td>${kindBadge(r.kind)}</td>
      </tr>`).join("");
  } catch {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Error loading data.</td></tr>`;
  }
}

// ══════════════════════════════════════════════════════════════════
//  ADD ENTRY  — tabs
// ══════════════════════════════════════════════════════════════════

function switchTab(tab) {
  document.getElementById("panel-manual").style.display = tab === "manual" ? "" : "none";
  document.getElementById("panel-ai").style.display     = tab === "ai"     ? "" : "none";
  document.getElementById("tab-manual").classList.toggle("active", tab === "manual");
  document.getElementById("tab-ai").classList.toggle("active",     tab === "ai");
  document.getElementById("tab-manual").setAttribute("aria-selected", tab === "manual");
  document.getElementById("tab-ai").setAttribute("aria-selected",     tab === "ai");
}

// Set today's date as default
document.getElementById("m-date").value = new Date().toISOString().slice(0, 10);

// ── Manual save ───────────────────────────────────────────────────────────────
async function submitManual(e) {
  e.preventDefault();
  const date     = document.getElementById("m-date").value;
  const customer = document.getElementById("m-customer").value.trim();
  const item     = document.getElementById("m-item").value.trim();
  const amount   = parseFloat(document.getElementById("m-amount").value);
  const kind     = document.getElementById("m-kind").value;

  if (!date || !customer || isNaN(amount)) {
    showToast("⚠ " + t("required"), "error");
    return;
  }

  const btn = document.getElementById("manual-save-btn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>`;

  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [{ date, customer, item: item || null, amount, kind }],
        force: true,   // manual entries skip duplicate check
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail?.message || t("save_err"));

    showToast("✓ " + t("saved_ok", data.saved), "success");
    document.getElementById("manual-form").reset();
    document.getElementById("m-date").value = new Date().toISOString().slice(0, 10);

  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = LANG === "np" ? "कारोबार सुरक्षित गर्नुहोस्" : "Save Transaction";
  }
}

// ══════════════════════════════════════════════════════════════════
//  ADD ENTRY  — AI extraction
// ══════════════════════════════════════════════════════════════════

const KINDS = ["sale", "credit", "payment", "expense"];

let aiState = { filename: null, fileHash: null, pageTotal: null, rows: [], issues: [] };

// Drop zone wiring
const dropZone   = document.getElementById("drop-zone");
const fileInput  = document.getElementById("file-input");
const fileNameEl = document.getElementById("ai-file-name");
const extractBtn = document.getElementById("extract-btn");

dropZone.addEventListener("click",   () => fileInput.click());
dropZone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const f = e.dataTransfer?.files?.[0];
  if (f) setAiFile(f);
});
fileInput.addEventListener("change", () => { if (fileInput.files[0]) setAiFile(fileInput.files[0]); });

function setAiFile(file) {
  fileNameEl.textContent = file.name;
  extractBtn.disabled = false;
  extractBtn._file = file;
}

// Extract
extractBtn.addEventListener("click", async () => {
  const file = extractBtn._file;
  if (!file) return;

  extractBtn.disabled = true;
  document.getElementById("extract-status").innerHTML = `<span class="spinner spinner-dark"></span>`;

  try {
    const fd = new FormData();
    fd.append("image", file);
    const res  = await fetch("/api/extract", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || t("extract_err"));

    aiState = {
      filename:  data.filename,
      fileHash:  data.file_hash,
      pageTotal: data.page_total,
      rows:      data.rows.map((r, i) => ({ ...r, _idx: i })),
      issues:    data.issues || [],
    };

    document.getElementById("ai-upload-step").style.display = "none";
    renderConfirm();
    document.getElementById("confirm-section").classList.add("visible");

  } catch (err) {
    showToast("❌ " + err.message, "error");
    extractBtn.disabled = false;
  } finally {
    document.getElementById("extract-status").textContent = "";
  }
});

// Re-upload
document.getElementById("reextract-btn").addEventListener("click", () => {
  document.getElementById("confirm-section").classList.remove("visible");
  document.getElementById("ai-upload-step").style.display = "";
  fileInput.value = "";
  fileNameEl.textContent = "";
  extractBtn.disabled = true;
  delete extractBtn._file;
  aiState = { filename: null, fileHash: null, pageTotal: null, rows: [], issues: [] };
});

// Render confirm table
function renderConfirm() {
  renderIssuesBanner();
  renderTotalsBar();
  renderExtractedTable();
}

function renderIssuesBanner() {
  const banner = document.getElementById("issues-banner");
  if (!aiState.issues.length) { banner.hidden = true; return; }
  const blocking = aiState.issues.filter(i => ["DUPLICATE_IN_DB","DUPLICATE_IN_BATCH"].includes(i.code));
  const type = blocking.length ? "error" : "warning";
  banner.className = `issues-banner ${type}`;
  banner.innerHTML = `<strong>${blocking.length ? "⛔" : "⚠"} ${blocking.length ? "Blocking issues" : "Warnings"}</strong>
    <ul>${aiState.issues.map(i => `<li>${esc(i.message)}${i.row >= 0 ? ` (row ${i.row + 1})` : ""}</li>`).join("")}</ul>`;
  banner.hidden = false;
}

function renderTotalsBar() {
  const sum = aiState.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const pt  = aiState.pageTotal;
  const mm  = pt && Math.abs(sum - pt) / pt > 0.01;
  document.getElementById("totals-bar").innerHTML =
    `<span>${LANG === "np" ? "जम्मा:" : "Rows total:"} <strong>${fmt(sum)}</strong></span>` +
    (pt ? `<span>${LANG === "np" ? "पृष्ठ जम्मा:" : "Page total:"} <strong class="${mm ? "mismatch" : ""}">${fmt(pt)}</strong>${mm ? " ⚠" : ""}</span>` : "") +
    `<span>${aiState.rows.length} ${t("tx")}</span>`;
}

function renderExtractedTable() {
  const tbody = document.getElementById("extracted-body");
  tbody.innerHTML = "";
  aiState.rows.forEach((row, i) => tbody.appendChild(buildExtractedRow(row, i)));
}

function buildExtractedRow(row, i) {
  const lcf  = row.low_confidence_fields || [];
  const conf = row.confidence;
  const confPct = typeof conf === "number" ? (conf * 100).toFixed(0) + "%" : "—";

  const tr = document.createElement("tr");
  tr.dataset.idx = i;

  function editCell(field, value) {
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.dataset.field   = field;
    td.textContent     = value ?? "";
    if (lcf.includes(field)) td.classList.add("low-conf");
    td.addEventListener("blur", () => {
      aiState.rows[i][field] = td.textContent.trim();
      if (field === "amount") renderTotalsBar();
    });
    return td;
  }

  // Row number
  const numTd = document.createElement("td");
  numTd.textContent = i + 1;
  numTd.style.color = "var(--muted)";
  tr.appendChild(numTd);

  tr.appendChild(editCell("date",     row.date));
  tr.appendChild(editCell("customer", row.customer));
  tr.appendChild(editCell("item",     row.item));
  tr.appendChild(editCell("amount",   row.amount));

  // Kind select
  const kindTd  = document.createElement("td");
  const badge   = document.createElement("span");
  badge.className = `kind-badge kind-${row.kind}`;
  const sel = document.createElement("select");
  sel.style.cssText = "border:none;background:transparent;font-size:12px;cursor:pointer;font-weight:700;";
  KINDS.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = t(`kind_${k}`);
    if (k === row.kind) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.addEventListener("change", () => {
    aiState.rows[i].kind = sel.value;
    badge.className = `kind-badge kind-${sel.value}`;
  });
  badge.appendChild(sel);
  kindTd.appendChild(badge);
  tr.appendChild(kindTd);

  // Confidence
  const confTd = document.createElement("td");
  confTd.style.color = (typeof conf === "number" && conf < 0.7) ? "var(--orange)" : "var(--muted)";
  confTd.textContent = confPct;
  tr.appendChild(confTd);

  // Delete
  const delTd  = document.createElement("td");
  const delBtn = document.createElement("button");
  delBtn.textContent = "✕";
  delBtn.className   = "btn btn-danger btn-sm";
  delBtn.style.padding = "3px 8px";
  delBtn.addEventListener("click", () => {
    aiState.rows.splice(i, 1);
    renderConfirm();
  });
  delTd.appendChild(delBtn);
  tr.appendChild(delTd);

  return tr;
}

// Add row
document.getElementById("add-row-btn").addEventListener("click", () => {
  aiState.rows.push({
    date: new Date().toISOString().slice(0, 10),
    customer: "", item: "", amount: 0, kind: "sale",
    confidence: 1.0, low_confidence_fields: [],
  });
  renderConfirm();
  document.getElementById("extracted-body").lastElementChild
    ?.querySelector("[data-field=customer]")?.focus();
});

// Save
document.getElementById("save-btn").addEventListener("click", async () => {
  // Flush any in-focus edits
  document.querySelectorAll("#extracted-body td[contenteditable]").forEach(td => {
    const i = +td.closest("tr").dataset.idx;
    aiState.rows[i][td.dataset.field] = td.textContent.trim();
  });

  for (const r of aiState.rows) {
    if (isNaN(parseFloat(r.amount))) {
      showToast("❌ " + (LANG === "np" ? "रकम अमान्य छ।" : "Fix invalid amounts first."), "error");
      return;
    }
  }

  const btn = document.getElementById("save-btn");
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>`;

  try {
    const payload = {
      filename:   aiState.filename,
      file_hash:  aiState.fileHash,
      page_total: aiState.pageTotal,
      force:      document.getElementById("force-save").checked,
      rows: aiState.rows.map(r => ({
        date:     r.date,
        customer: r.customer,
        item:     r.item || null,
        amount:   parseFloat(r.amount),
        kind:     r.kind,
      })),
    };

    const res  = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      aiState.issues = data.detail?.issues || [];
      renderIssuesBanner();
      showToast("❌ " + (data.detail?.message || t("save_err")), "error");
      return;
    }

    showToast("✓ " + t("saved_ok", data.saved), "success");
    // Reset to upload step
    document.getElementById("reextract-btn").click();

  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = LANG === "np" ? "बहीखातामा सुरक्षित गर्नुहोस्" : "Save to ledger";
  }
});

// ── Utility ───────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Boot ──────────────────────────────────────────────────────────────────────
applyLangToDOM();
const initSection = location.hash.replace("#", "") || "overview";
showSection(SECTIONS.includes(initSection) ? initSection : "overview");
