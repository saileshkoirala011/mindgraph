/* ── MindGraph AI — index.html logic ── */

const KINDS = ["sale", "credit", "payment", "expense"];

// ── State ──────────────────────────────────────────────────────────────────
let state = {
  filename: null,
  fileHash: null,
  pageTotal: null,
  rows: [],       // mutable copies of the extracted rows
  issues: [],
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const dropZone       = document.getElementById("drop-zone");
const fileInput      = document.getElementById("file-input");
const fileNameEl     = document.getElementById("file-name");
const extractBtn     = document.getElementById("extract-btn");
const extractStatus  = document.getElementById("extract-status");
const uploadSection  = document.getElementById("upload-section");
const confirmSection = document.getElementById("confirm-section");
const successSection = document.getElementById("success-section");
const issuesBanner   = document.getElementById("issues-banner");
const totalsBar      = document.getElementById("totals-bar");
const rowsBody       = document.getElementById("rows-body");
const saveBtn        = document.getElementById("save-btn");
const addRowBtn      = document.getElementById("add-row-btn");
const reuploadBtn    = document.getElementById("reupload-btn");
const forceCheckbox  = document.getElementById("force-save");
const successMsg     = document.getElementById("success-msg");
const anotherBtn     = document.getElementById("another-btn");
const toast          = document.getElementById("toast");

// ── Toast ──────────────────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = "info") {
  toast.textContent = msg;
  toast.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = ""; }, 3500);
}

// ── File pick / drag-drop ──────────────────────────────────────────────────
dropZone.addEventListener("click", () => fileInput.click());
dropZone.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });

dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", e => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  const file = e.dataTransfer?.files?.[0];
  if (file) setFile(file);
});

fileInput.addEventListener("change", () => {
  if (fileInput.files[0]) setFile(fileInput.files[0]);
});

function setFile(file) {
  fileNameEl.textContent = file.name;
  extractBtn.disabled = false;
  extractBtn._file = file;
}

// ── Extract ────────────────────────────────────────────────────────────────
extractBtn.addEventListener("click", async () => {
  const file = extractBtn._file;
  if (!file) return;

  extractBtn.disabled = true;
  extractStatus.innerHTML = '<span class="spinner"></span> Extracting…';

  try {
    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch("/api/extract", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Extract failed");

    state.filename  = data.filename;
    state.fileHash  = data.file_hash;
    state.pageTotal = data.page_total;
    state.rows      = data.rows.map((r, i) => ({ ...r, _idx: i }));
    state.issues    = data.issues || [];

    renderConfirmSection();
    uploadSection.hidden  = true;
    confirmSection.hidden = false;
    confirmSection.scrollIntoView({ behavior: "smooth" });

  } catch (err) {
    showToast("❌ " + err.message, "error");
    extractBtn.disabled = false;
  } finally {
    extractStatus.textContent = "";
  }
});

// ── Render confirm section ─────────────────────────────────────────────────
function renderConfirmSection() {
  renderIssuesBanner();
  renderTotalsBar();
  renderTable();
}

function renderIssuesBanner() {
  if (!state.issues.length) { issuesBanner.hidden = true; return; }

  const blocking = state.issues.filter(i =>
    ["DUPLICATE_IN_DB","DUPLICATE_IN_BATCH"].includes(i.code));
  const type = blocking.length ? "error" : "warning";

  issuesBanner.className = `issues-banner ${type}`;
  issuesBanner.innerHTML = `
    <strong>${blocking.length ? "⛔ Blocking issues" : "⚠ Warnings"} — review before saving</strong>
    <ul>
      ${state.issues.map(i => `<li>${i.message}${i.row >= 0 ? ` (row ${i.row + 1})` : ""}</li>`).join("")}
    </ul>`;
  issuesBanner.hidden = false;
}

function renderTotalsBar() {
  const rowSum = state.rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const pt = state.pageTotal;
  const mismatch = pt && Math.abs(rowSum - pt) / pt > 0.01;
  totalsBar.innerHTML = `
    <span>Rows total: <strong>${rowSum.toFixed(2)}</strong></span>
    ${pt ? `<span>Page total (model): <strong class="${mismatch ? "mismatch" : ""}">${pt.toFixed(2)}</strong>${mismatch ? " ⚠" : ""}</span>` : ""}
    <span>${state.rows.length} row${state.rows.length !== 1 ? "s" : ""}</span>`;
}

function renderTable() {
  rowsBody.innerHTML = "";
  state.rows.forEach((row, i) => appendRow(row, i));
}

function appendRow(row, i) {
  const lcf = row.low_confidence_fields || [];
  const conf = row.confidence;
  const confPct = typeof conf === "number" ? (conf * 100).toFixed(0) + "%" : "—";

  const tr = document.createElement("tr");
  tr.dataset.idx = i;

  function cell(field, value) {
    const td = document.createElement("td");
    td.contentEditable = "true";
    td.dataset.field = field;
    td.textContent = value ?? "";
    if (lcf.includes(field)) td.classList.add("low-conf");
    td.addEventListener("blur", () => {
      state.rows[i][field] = td.textContent.trim();
      if (field === "amount") renderTotalsBar();
    });
    return td;
  }

  // # (row number, not editable)
  const numTd = document.createElement("td");
  numTd.textContent = i + 1;
  numTd.style.color = "#6e6e73";
  tr.appendChild(numTd);

  tr.appendChild(cell("date",     row.date));
  tr.appendChild(cell("customer", row.customer));
  tr.appendChild(cell("item",     row.item));
  tr.appendChild(cell("amount",   row.amount));

  // Kind: dropdown
  const kindTd = document.createElement("td");
  const sel = document.createElement("select");
  sel.style.cssText = "border:none;background:transparent;font-size:13px;cursor:pointer;";
  KINDS.forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    if (k === row.kind) opt.selected = true;
    sel.appendChild(opt);
  });
  // Wrap in badge
  const badge = document.createElement("span");
  badge.className = `kind-badge kind-${row.kind}`;
  badge.appendChild(sel);
  kindTd.appendChild(badge);
  sel.addEventListener("change", () => {
    state.rows[i].kind = sel.value;
    badge.className = `kind-badge kind-${sel.value}`;
  });
  tr.appendChild(kindTd);

  // Confidence
  const confTd = document.createElement("td");
  confTd.style.color = (typeof conf === "number" && conf < 0.7) ? "#ff9500" : "#6e6e73";
  confTd.textContent = confPct;
  tr.appendChild(confTd);

  // Delete button
  const delTd = document.createElement("td");
  const delBtn = document.createElement("button");
  delBtn.textContent = "✕";
  delBtn.title = "Remove row";
  delBtn.className = "btn btn-danger";
  delBtn.style.cssText = "padding:3px 8px;font-size:12px;";
  delBtn.addEventListener("click", () => {
    state.rows.splice(i, 1);
    renderConfirmSection();
  });
  delTd.appendChild(delBtn);
  tr.appendChild(delTd);

  rowsBody.appendChild(tr);
}

// ── Add blank row ──────────────────────────────────────────────────────────
addRowBtn.addEventListener("click", () => {
  state.rows.push({
    date: new Date().toISOString().slice(0, 10),
    customer: "",
    item: "",
    amount: 0,
    kind: "sale",
    confidence: 1.0,
    low_confidence_fields: [],
  });
  renderConfirmSection();
  // Focus the customer cell of the new row
  const lastRow = rowsBody.lastElementChild;
  lastRow?.querySelector("[data-field=customer]")?.focus();
});

// ── Re-upload ──────────────────────────────────────────────────────────────
reuploadBtn.addEventListener("click", resetToUpload);
anotherBtn.addEventListener("click", resetToUpload);

function resetToUpload() {
  fileInput.value = "";
  fileNameEl.textContent = "";
  extractBtn.disabled = true;
  delete extractBtn._file;
  uploadSection.hidden  = false;
  confirmSection.hidden = true;
  successSection.hidden = true;
  state = { filename:null, fileHash:null, pageTotal:null, rows:[], issues:[] };
}

// ── Save ───────────────────────────────────────────────────────────────────
saveBtn.addEventListener("click", async () => {
  // Read any in-progress edits (blur-based sync may miss if user clicks Save directly)
  document.querySelectorAll("#rows-body td[contenteditable]").forEach(td => {
    const idx  = +td.closest("tr").dataset.idx;
    const field = td.dataset.field;
    state.rows[idx][field] = td.textContent.trim();
  });

  // Validate amounts
  for (const r of state.rows) {
    if (isNaN(parseFloat(r.amount))) {
      showToast("❌ Fix invalid amounts before saving.", "error");
      return;
    }
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

  try {
    const payload = {
      filename:   state.filename,
      file_hash:  state.fileHash,
      page_total: state.pageTotal,
      force:      forceCheckbox.checked,
      rows: state.rows.map(r => ({
        date:     r.date,
        customer: r.customer,
        item:     r.item || null,
        amount:   parseFloat(r.amount),
        kind:     r.kind,
      })),
    };

    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) {
      // 409 = blocking duplicates
      const detail = data.detail || {};
      const msgs = (detail.issues || []).map(i => i.message).join("\n");
      showToast("❌ " + (detail.message || "Save failed"), "error");
      // Refresh issues banner
      state.issues = detail.issues || [];
      renderIssuesBanner();
      return;
    }

    // Success
    confirmSection.hidden = true;
    successSection.hidden = false;
    successMsg.textContent =
      `${data.saved} transaction${data.saved !== 1 ? "s" : ""} saved.` +
      (data.warnings?.length
        ? ` ${data.warnings.length} warning(s) recorded.`
        : "");
    showToast("✓ Saved successfully", "success");

  } catch (err) {
    showToast("❌ " + err.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save to ledger";
  }
});
