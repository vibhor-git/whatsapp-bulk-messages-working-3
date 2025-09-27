// --- Send Form ---
document.getElementById("sendForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const statusDiv = document.getElementById("status");
    statusDiv.innerHTML = "Sending messages...";

    fetch("/send", {
        method: "POST",
        body: formData
    })
    .then(res => res.json())
    .then(data => {
        statusDiv.innerHTML = "";
        if (data.status === "success") {
            data.messages.forEach(msg => appendStatus(msg));
            setTimeout(() => { location.reload(); }, 2000);
        } else {
            appendStatus("Error: " + data.message);
        }
    })
    .catch(err => { appendStatus("Error: " + err); });
});

// --- Append Status Function ---
function appendStatus(msg) {
    const statusDiv = document.getElementById("status");
    const p = document.createElement("p");
    p.textContent = msg;
    statusDiv.appendChild(p);
    statusDiv.scrollTop = statusDiv.scrollHeight;
}

// --- Show Loading Modal ---
function showLoadingModal() {
    document.getElementById("loadingModal").style.display = "flex";
}

// --- Hide Loading Modal ---
function hideLoadingModal() {
    document.getElementById("loadingModal").style.display = "none";
}

// --- Download Report Function ---
function downloadReport(historyId) {
    showLoadingModal();
    
    fetch(`/download-report/${historyId}`)
    .then(response => {
        hideLoadingModal();
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'report.pdf';
        if (contentDisposition) {
            const matches = contentDisposition.match(/filename="(.+)"/);
            if (matches) {
                filename = matches[1];
            }
        }
        
        return response.blob().then(blob => ({ blob, filename }));
    })
    .then(({ blob, filename }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        
        document.body.appendChild(a);
        a.click();
        
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        appendStatus(`Report downloaded successfully: ${filename}`);
    })
    .catch(err => {
        hideLoadingModal();
        console.error('Download error:', err);
        appendStatus("Error downloading report: " + err.message);
    });
}

// --- Remove all existing event listeners before attaching new ones ---
function removeAllButtonListeners() {
    document.querySelectorAll(".refillBtn, .downloadBtn, .deleteBtn").forEach(btn => {
        btn.replaceWith(btn.cloneNode(true));
    });
}

// --- Refill Buttons ---
function attachRefillButtons() {
    document.querySelectorAll(".refillBtn").forEach(btn => {
        btn.addEventListener("click", function() {
            const id = this.dataset.id;
            fetch(`/refill/${id}`)
            .then(res => res.json())
            .then(data => {
                if (!data.status) {
                    document.querySelector('input[name="history_title"]').value = data.history_title;
                    document.querySelector('input[name="message_title"]').value = data.message_title;
                    document.querySelector('textarea[name="message_body"]').value = data.message_body;
                    document.querySelector('input[name="google_drive_link"]').value = data.google_drive_link;
                    document.querySelector('textarea[name="phone_numbers_csv"]').value = data.phone_numbers_csv;
                    document.getElementById('excel_file').value = "";
                    alert("Data refilled from history!");
                    
                    document.querySelector('form').scrollIntoView({ behavior: 'smooth' });
                } else {
                    appendStatus("Error: " + data.message);
                }
            })
            .catch(err => appendStatus("Error: " + err));
        });
    });
}

// --- Download Report Buttons ---
function attachDownloadButtons() {
    document.querySelectorAll(".downloadBtn").forEach(btn => {
        btn.addEventListener("click", function() {
            const id = this.dataset.id;
            downloadReport(id);
        });
    });
}

// --- Delete Buttons ---
function attachDeleteButtons() {
    document.querySelectorAll(".deleteBtn").forEach(btn => {
        btn.addEventListener("click", function() {
            const id = this.dataset.id;
            const historyTitle = this.closest('tr').querySelector('td:nth-child(2)').textContent;
            
            if (confirm(`Are you sure you want to delete the record: "${historyTitle}"?\n\nDeleted Succussfully.`)) {
                fetch(`/delete/${id}`, { method: "DELETE" })
                .then(res => {
                    const contentType = res.headers.get("content-type") || "";
                    if (contentType.includes("application/json")) {
                        return res.json();
                    } else {
                        return res.text().then(text => {
                            throw new Error("Expected JSON but got HTML: " + text);
                        });
                    }
                })
                .then(data => {
                    if (data.status === "success") {
                        const row = document.querySelector(`tr[data-id='${id}']`);
                        if (row) {
                            row.remove();
                        }
                        appendStatus(`Record "${historyTitle}" deleted successfully.`);
                        showPage(currentPage);
                    } else {
                        appendStatus("Error: " + data.message);
                    }
                })
                .catch(err => appendStatus("Error: " + err.message));
            }
        });
    });
}

// --- Attach all button event listeners ---
function attachAllButtons() {
    removeAllButtonListeners(); // Remove existing listeners first
    attachRefillButtons();
    attachDownloadButtons();
    attachDeleteButtons();
}

// Attach buttons on load
attachAllButtons();

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
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    rows.forEach((row, index) => {
        row.style.display = index >= start && index < end ? "" : "none";
    });

    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages || totalPages === 0;
    
    // Re-attach button listeners for visible rows
    attachAllButtons();
}

// Initialize pagination
showPage(currentPage);

nextBtn.addEventListener("click", () => {
    const rows = tableBody.querySelectorAll("tr").length;
    const totalPages = Math.ceil(rows / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        showPage(currentPage);
    }
});

prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
    }
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('sendForm').dispatchEvent(new Event('submit'));
    }
});

// --- Auto-save form data to localStorage ---
const formElements = ['phone_numbers_csv', 'message_title', 'message_body', 'google_drive_link', 'history_title'];

formElements.forEach(elementName => {
    const element = document.querySelector(`[name="${elementName}"]`);
    const savedValue = localStorage.getItem(`whatsapp_form_${elementName}`);
    if (savedValue && element) {
        element.value = savedValue;
    }
});

formElements.forEach(elementName => {
    const element = document.querySelector(`[name="${elementName}"]`);
    if (element) {
        element.addEventListener('input', function() {
            localStorage.setItem(`whatsapp_form_${elementName}`, this.value);
        });
    }
});

document.getElementById("sendForm").addEventListener("submit", function() {
    setTimeout(() => {
        formElements.forEach(elementName => {
            localStorage.removeItem(`whatsapp_form_${elementName}`);
        });
    }, 3000);
});
