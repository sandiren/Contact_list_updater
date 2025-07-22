
let contacts = [];

document.getElementById("contactForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const index = document.getElementById("editingIndex").value;
  const contact = {
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    address: document.getElementById("address").value.trim(),
    birthday: document.getElementById("birthday").value.trim()
  };
  if (!contact.name || !contact.phone) return alert("Name and Phone are required.");

  if (index) {
    contacts[+index] = contact;
  } else {
    if (contacts.find(c => c.phone === contact.phone)) {
      return alert("Duplicate phone number.");
    }
    contacts.push(contact);
  }
  renderContacts();
  this.reset();
  document.getElementById("editingIndex").value = "";
  bootstrap.Modal.getInstance(document.getElementById("contactModal")).hide();
});

function renderContacts(data = contacts) {
  const grid = document.getElementById("contactsGrid");
  grid.innerHTML = data.map((c, i) => `
    <div class="contact-card">
      <strong>${c.name}</strong><br />
      📞 ${c.phone}<br />
      ${c.email ? `✉️ ${c.email}<br />` : ""}
      ${c.address ? `📍 ${c.address}<br />` : ""}
      ${c.birthday ? `🎂 ${c.birthday} <button class="btn-small btn-secondary" onclick="downloadBirthdayICS('${c.name}', '${c.birthday}')">📅</button>` : ""}
      <br />
      <button class="btn-small btn-primary" onclick="editContact(${i})">✏️ Edit</button>
      <button class="btn-small btn-danger" onclick="deleteContact(${i})">🗑 Delete</button>
    </div>
  `).join("");
}

function editContact(i) {
  const c = contacts[i];
  document.getElementById("name").value = c.name;
  document.getElementById("phone").value = c.phone;
  document.getElementById("email").value = c.email;
  document.getElementById("address").value = c.address;
  document.getElementById("birthday").value = c.birthday;
  document.getElementById("editingIndex").value = i;
  new bootstrap.Modal(document.getElementById("contactModal")).show();
}

function deleteContact(i) {
  if (confirm("Delete this contact?")) {
    contacts.splice(i, 1);
    renderContacts();
  }
}

function resetForm() {
  document.getElementById("editingIndex").value = "";
}

function filterContacts() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  renderContacts(contacts.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.phone.includes(q) ||
    (c.email && c.email.toLowerCase().includes(q))
  ));
}

function exportContacts() {
  const vcf = contacts.map(c => `BEGIN:VCARD
VERSION:3.0
UID:uid-${c.phone}
FN:${c.name}
TEL:${c.phone}
${c.email ? `EMAIL:${c.email}` : ""}
${c.address ? `ADR:;;${c.address};;;;` : ""}
${c.birthday ? `BDAY:${c.birthday}` : ""}
END:VCARD`).join("\n\n");
  const blob = new Blob([vcf], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "contacts.vcf";
  a.click();
}

function exportToExcel() {
  const ws = XLSX.utils.json_to_sheet(contacts);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contacts");
  XLSX.writeFile(wb, "contacts.xlsx");
}

function downloadBirthdayICS(name, date) {
  const d = new Date(date);
  const str = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:🎂 ${name}'s Birthday
DTSTART;VALUE=DATE:${str}
RRULE:FREQ=YEARLY
END:VEVENT
END:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${name}_birthday.ics`;
  a.click();
}

function downloadAllBirthdays() {
  const events = contacts.filter(c => c.birthday).map(c => {
    const d = new Date(c.birthday);
    const str = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    return `BEGIN:VEVENT
SUMMARY:🎂 ${c.name}'s Birthday
DTSTART;VALUE=DATE:${str}
RRULE:FREQ=YEARLY
END:VEVENT`;
  }).join("\n");
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\n${events}\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "birthday_calendar.ics";
  a.click();
}

function generateQRCode() {
  const link = document.getElementById("vcfLink").value;
  if (!link) return alert("Please enter a VCF URL.");
  const qr = `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(link)}`;
  document.getElementById("qrCode").innerHTML = `<img src="\${qr}" alt="QR Code">`;
}

function handleUpload() {
  const file = document.getElementById("unifiedUpload").files[0];
  if (!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === "vcf") importVCF(file);
  else if (ext === "xlsx" || ext === "csv") importExcel(file);
  else alert("Unsupported file type.");
}

function importVCF(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split(/\r?\n/);
    let contact = {};
    lines.forEach(line => {
      if (line.startsWith("FN:")) contact.name = line.slice(3);
      else if (line.startsWith("TEL:")) contact.phone = line.slice(4);
      else if (line.startsWith("EMAIL:")) contact.email = line.slice(6);
      else if (line.startsWith("ADR:")) contact.address = line.split(":")[1]?.replace(/;/g, " ");
      else if (line.startsWith("BDAY:")) contact.birthday = line.slice(5);
      else if (line === "END:VCARD") {
        if (contact.phone && !contacts.find(c => c.phone === contact.phone)) contacts.push({...contact});
        contact = {};
      }
    });
    renderContacts();
    alert("VCF imported.");
  };
  reader.readAsText(file);
}

function importExcel(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const data = new Uint8Array(e.target.result);
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);
    rows.forEach(row => {
      if (!row.Phone || contacts.find(c => c.phone === row.Phone)) return;
      contacts.push({
        name: row.Name || "",
        phone: row.Phone,
        email: row.Email || "",
        address: row.Address || "",
        birthday: row.Birthday || ""
      });
    });
    renderContacts();
    alert("Excel imported.");
  };
  reader.readAsArrayBuffer(file);
}
