// --- Send Form ---
const sendForm = document.getElementById("sendForm");
if (sendForm) {
  sendForm.addEventListener("submit", async e => {
    e.preventDefault();
    const statusDiv = document.getElementById("status");
    statusDiv.textContent = "Sending messages...";
    const formData = new FormData(sendForm);

    try {
      const res = await fetch("/send", { method: "POST", body: formData });
      const data = await res.json();
      statusDiv.textContent = "";
      if (data.status === "success") {
        data.messages.forEach(msg => appendStatus(msg));
        setTimeout(() => location.reload(), 2000);
      } else {
        appendStatus("Error: " + data.message);
      }
    } catch (err) {
      appendStatus("Error: " + err);
    }
  });
}

// --- Append Status Function ---
function appendStatus(msg) {
  const statusDiv = document.getElementById("status");
  const p = document.createElement("p");
  p.textContent = msg;
  statusDiv.appendChild(p);
  statusDiv.scrollTop = statusDiv.scrollHeight;
}

// --- Show/Hide Loading Modal ---
function showLoadingModal() {
  const modal = document.getElementById("loadingModal");
  if (modal) modal.style.display = "flex";
}
function hideLoadingModal() {
  const modal = document.getElementById("loadingModal");
  if (modal) modal.style.display = "none";
}

// --- Download Report Function (on report page) ---
async function downloadReport(historyId) {
  showLoadingModal();
  try {
    const res = await fetch(`/download-report/${historyId}`);
    hideLoadingModal();
    if (!res.ok) throw new Error("Network response was not ok");
    const cd = res.headers.get("content-disposition") || "";
    let filename = "report.pdf";
    const m = cd.match(/filename="(.+)"/);
    if (m) filename = m[1];
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    appendStatus(`Report downloaded successfully: ${filename}`);
  } catch (err) {
    hideLoadingModal();
    appendStatus("Error downloading report: " + err.message);
  }
}

// --- Refill Buttons ---
function attachRefillButtons() {
  document.querySelectorAll(".refillBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      try {
        const res = await fetch(`/refill/${id}`);
        const data = await res.json();
        if (!data.status) {
          document.querySelector('input[name="history_title"]').value = data.history_title;
          document.querySelector('input[name="message_title"]').value = data.message_title;
          document.querySelector('textarea[name="message_body"]').value = data.message_body;
          document.querySelector('input[name="google_drive_link"]').value = data.google_drive_link;
          document.querySelector('textarea[name="phone_numbers_csv"]').value = data.phone_numbers_csv;
          document.getElementById("excel_file").value = "";
          alert("Form refilled from history!");
          sendForm.scrollIntoView({ behavior: "smooth" });
        } else {
          appendStatus("Error: " + data.message);
        }
      } catch (err) {
        appendStatus("Error: " + err);
      }
    });
  });
}

// --- Delete Buttons ---
function attachDeleteButtons() {
  document.querySelectorAll(".deleteBtn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const title = btn.closest("tr").querySelector("td:nth-child(2)").textContent;
      if (!confirm(`Delete "${title}"?`)) return;
      try {
        const res = await fetch(`/delete/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (data.status === "success") {
          btn.closest("tr").remove();
          appendStatus(`Record "${title}" deleted.`);
        } else {
          appendStatus("Error: " + data.message);
        }
      } catch (err) {
        appendStatus("Error: " + err.message);
      }
    });
  });
}

// --- Pagination ---
let currentPage = 1;
const rowsPerPage = 10;
const tableBody = document.getElementById("historyTableBody");
const pageInfo = document.getElementById("pageInfo");
const prevBtn = document.getElementById("prevPage");
const nextBtn = document.getElementById("nextPage");

function showPage(page) {
  const rows = Array.from(tableBody.querySelectorAll("tr"));
  const totalPages = Math.ceil(rows.length / rowsPerPage);
  rows.forEach((row, i) => {
    row.style.display = i >= (page-1)*rowsPerPage && i < page*rowsPerPage ? "" : "none";
  });
  pageInfo.textContent = `Page ${page} of ${totalPages}`;
  prevBtn.disabled = page === 1;
  nextBtn.disabled = page === totalPages;
}

if (tableBody) {
  showPage(currentPage);
  prevBtn.addEventListener("click", () => { if (currentPage>1) showPage(--currentPage); });
  nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(tableBody.querySelectorAll("tr").length/rowsPerPage);
    if (currentPage<totalPages) showPage(++currentPage);
  });
}

// --- Report Page Buttons ---
// --- Report Page Buttons ---
const backBtn = document.getElementById("btnBack");
if (backBtn) {
  backBtn.addEventListener("click", () => {
    window.location.href = "/main";
  });
}

const downloadPdfBtn = document.getElementById("btnDownloadPdf");
if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener("click", () => {
    if (!DOCUMENT_HISTORY_ID) {
      alert("Report ID is missing - cannot download");
      return;
    }
    downloadReport(DOCUMENT_HISTORY_ID);
  });
}



// --- Auto-save form data ---
const formElements = ['phone_numbers_csv','message_title','message_body','google_drive_link','history_title'];
formElements.forEach(name => {
  const el = document.querySelector(`[name="${name}"]`);
  if (!el) return;
  const saved = localStorage.getItem(`whatsapp_form_${name}`);
  if (saved) el.value = saved;
  el.addEventListener("input", () => localStorage.setItem(`whatsapp_form_${name}`, el.value));
});
if (sendForm) {
  sendForm.addEventListener("submit", () => {
    setTimeout(() => formElements.forEach(n => localStorage.removeItem(`whatsapp_form_${n}`)), 3000);
  });
}
