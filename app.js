// Global state
let contacts = [];
let categories = [];
let customFieldDefs = [];
let currentFilter = { active: true }; // Default to show active contacts

// Check login status on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check for login status
    if (!sessionStorage.getItem('isLoggedIn')) {
        // If not on login page, redirect
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        // If on login page, initialize DB for login check
        else {
            await DB.init();
            document.getElementById('loginForm').addEventListener('submit', handleLogin);
        }
        return; // Don't initialize main app if not logged in
    }

    // If logged in but on login page, redirect to app
    if (window.location.pathname.endsWith('login.html')) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize the database and load data
    await DB.init();
    await loadInitialData();
    setupUIEventListeners();
});

async function loadInitialData() {
    // Fetch all required data from the local DB
    const isActiveFilter = currentFilter.active ? 1 : 0;
    const contactsSql = `
        SELECT c.*, GROUP_CONCAT(cat.name) as categories
        FROM contacts c
        LEFT JOIN contact_categories cc ON c.id = cc.contact_id
        LEFT JOIN categories cat ON cc.category_id = cat.id
        WHERE c.is_active = ?
        GROUP BY c.id
    `;
    contacts = DB.exec(contactsSql, [isActiveFilter]);

    categories = DB.exec('SELECT * FROM categories ORDER BY name');
    customFieldDefs = DB.exec('SELECT * FROM custom_fields_definitions ORDER BY field_name');

    // For each contact, fetch its custom fields
    contacts.forEach(contact => {
        const customFieldsSql = `
            SELECT cfd.field_name, cfv.value
            FROM custom_fields_values cfv
            JOIN custom_fields_definitions cfd ON cfv.field_id = cfd.id
            WHERE cfv.contact_id = ?
        `;
        const fields = DB.exec(customFieldsSql, [contact.id]);
        contact.custom_fields = fields.reduce((acc, field) => {
            acc[field.field_name] = field.value;
            return acc;
        }, {});
    });

    renderContacts();
    populateCategoryFilter();
}

function setupUIEventListeners() {
    // Main page listeners
    if(document.getElementById('searchInput')) {
        document.getElementById('searchInput').addEventListener('input', filterContacts);
        document.getElementById('logoutButton').addEventListener('click', logout);
        document.getElementById('addContactBtn').addEventListener('click', () => openContactModal());
        document.getElementById('filterToggle').addEventListener('change', toggleActiveFilter);
        document.getElementById('exportDbBtn').addEventListener('click', () => DB.exportDb());
        document.getElementById('importDbInput').addEventListener('change', handleDbImport);

        // Bulk Actions
        document.getElementById('bulkApplyBtn').addEventListener('click', handleBulkAction);

        // Modals
        const categoriesModal = document.getElementById('categoriesModal');
        categoriesModal.addEventListener('show.bs.modal', renderCategoryList);
        document.getElementById('addCategoryForm').addEventListener('submit', addCategory);

        const customFieldsModal = document.getElementById('customFieldsModal');
        customFieldsModal.addEventListener('show.bs.modal', renderCustomFieldList);
        document.getElementById('addCustomFieldForm').addEventListener('submit', addCustomField);
    }

    // Add/Edit Contact Form
    if (document.getElementById('contactForm')) {
       document.getElementById('contactForm').addEventListener('submit', handleSaveContact);
    }
}

// --- RENDERING ---
function renderContacts(data = contacts) {
    const grid = document.getElementById('contactsGrid');
    if (!grid) return;
    grid.innerHTML = data.map((c) => `
        <div class="contact-card">
            <input type="checkbox" class="contact-select" data-contact-id="${c.id}">
            <strong>${c.name}</strong> ${c.is_active ? '' : '<span class="badge bg-secondary">Archived</span>'}<br />
            📞 ${c.phone}<br />
            ${c.email ? `✉️ ${c.email}<br />` : ""}
            ${c.address ? `📍 ${c.address}<br />` : ""}
            ${c.birthday ? `🎂 ${c.birthday}<br />` : ""}
            ${c.categories ? `<div class="mt-1"><strong>Categories:</strong> <span class="badge bg-info">${c.categories.split(',').join('</span> <span class="badge bg-info">')}</span></div>` : ""}
            ${renderCustomFields(c.custom_fields)}
            <hr>
            <button class="btn-small btn-primary" onclick="openContactModal(${c.id})">✏️ Edit</button>
            <button class="btn-small btn-danger" onclick="deleteContact(${c.id})">🗑 Delete</button>
        </div>
    `).join("");
}

function renderCustomFields(fields) {
    if (!fields || Object.keys(fields).length === 0) return '';
    let html = '<div class="mt-1"><strong>Details:</strong><br/>';
    for (const [key, value] of Object.entries(fields)) {
        html += `&bull; ${key}: ${value}<br/>`;
    }
    html += '</div>';
    return html;
}

// --- DATA MANIPULATION ---
function handleSaveContact(e) {
    e.preventDefault();
    const editingId = document.getElementById('editingIndex').value;
    const contactData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        birthday: document.getElementById('birthday').value,
        is_active: document.getElementById('is_active').checked ? 1 : 0,
    };
    const selectedCategoryIds = Array.from(document.getElementById('categories').selectedOptions).map(opt => opt.value);
    let contactId = editingId;

    if (editingId) {
        const sql = `UPDATE contacts SET name=?, phone=?, email=?, address=?, birthday=?, is_active=? WHERE id=?`;
        DB.run(sql, [contactData.name, contactData.phone, contactData.email, contactData.address, contactData.birthday, contactData.is_active, editingId]);
    } else {
        const sql = 'INSERT INTO contacts (name, phone, email, address, birthday, is_active) VALUES (?, ?, ?, ?, ?, ?)';
        DB.run(sql, [contactData.name, contactData.phone, contactData.email, contactData.address, contactData.birthday, contactData.is_active]);
        const newContact = DB.exec('SELECT last_insert_rowid() as id');
        contactId = newContact[0].id;
    }

    DB.run('DELETE FROM contact_categories WHERE contact_id = ?', [contactId]);
    if (selectedCategoryIds.length) {
        const catStmt = 'INSERT INTO contact_categories (contact_id, category_id) VALUES (?, ?)';
        selectedCategoryIds.forEach(catId => DB.run(catStmt, [contactId, catId]));
    }

    DB.run('DELETE FROM custom_fields_values WHERE contact_id = ?', [contactId]);
    customFieldDefs.forEach(field => {
        const input = document.getElementById(`custom_${field.id}`);
        if(input && input.value) {
            DB.run('INSERT INTO custom_fields_values (contact_id, field_id, value) VALUES (?, ?, ?)', [contactId, field.id, input.value]);
        }
    });

    bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
    loadInitialData();
}

function deleteContact(id) {
    if (confirm("Are you sure you want to delete this contact?")) {
        DB.run('DELETE FROM contacts WHERE id = ?', [id]);
        loadInitialData();
    }
}

// --- MODAL & UI HELPERS ---
function openContactModal(contactId = null) {
    resetForm();
    populateCategoriesDropdown();
    populateCustomFieldsForm();

    if (contactId) {
        const contact = DB.exec('SELECT * FROM contacts WHERE id = ?', [contactId])[0];
        if (contact) {
            document.getElementById('editingIndex').value = contact.id;
            document.getElementById('contactModalLabel').textContent = 'Edit Contact';
            document.getElementById('name').value = contact.name;
            document.getElementById('phone').value = contact.phone;
            document.getElementById('email').value = contact.email || '';
            document.getElementById('address').value = contact.address || '';
            document.getElementById('birthday').value = contact.birthday || '';
            document.getElementById('is_active').checked = contact.is_active;

            const assignedCategoriesResult = DB.exec('SELECT category_id FROM contact_categories WHERE contact_id = ?', [contactId]);
            const assignedCategoryIds = assignedCategoriesResult.map(c => c.category_id);
            Array.from(document.getElementById('categories').options).forEach(opt => {
                if (assignedCategoryIds.includes(parseInt(opt.value))) opt.selected = true;
            });

            const customValues = DB.exec('SELECT field_id, value FROM custom_fields_values WHERE contact_id = ?', [contactId]);
            customValues.forEach(val => {
                const input = document.getElementById(`custom_${val.field_id}`);
                if (input) input.value = val.value;
            });
        }
    } else {
        document.getElementById('contactModalLabel').textContent = 'Add Contact';
    }
    new bootstrap.Modal(document.getElementById('contactModal')).show();
}

function resetForm() {
    if(document.getElementById('contactForm')) {
        document.getElementById('contactForm').reset();
        document.getElementById('editingIndex').value = '';
        document.getElementById('is_active').checked = true;
        document.getElementById('customFieldsContainer').innerHTML = '';
    }
}

function filterContacts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(query) || c.phone.includes(query) || (c.email && c.email.toLowerCase().includes(query)));
    renderContacts(filteredContacts);
}

async function toggleActiveFilter() {
    currentFilter.active = document.getElementById('filterToggle').checked;
    await loadInitialData();
}

function populateCategoriesDropdown() {
    const select = document.getElementById('categories');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function populateCustomFieldsForm() {
    const container = document.getElementById('customFieldsContainer');
    container.innerHTML = customFieldDefs.map(field => `
        <div class="mb-3"><label class="form-label">${field.field_name}</label>
        <input type="${field.field_type === 'DATE' ? 'date' : 'text'}" id="custom_${field.id}" class="form-control" /></div>
    `).join('');
}

// --- AUTHENTICATION ---
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const user = DB.exec('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);

    if (user.length > 0) {
        sessionStorage.setItem('isLoggedIn', 'true');
        window.location.href = 'index.html';
    } else {
        document.getElementById('errorMessage').textContent = 'Invalid username or password.';
    }
}

function logout() {
    sessionStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

// --- QR CODE & DB MANAGEMENT ---
async function generateQRCode() {
  const qrCodeDiv = document.getElementById('qrCode');
  qrCodeDiv.innerHTML = 'Generating...';
  const activeContacts = DB.exec('SELECT * FROM contacts WHERE is_active = 1');
  if (activeContacts.length === 0) {
      qrCodeDiv.innerHTML = 'No active contacts to generate a QR code for.';
      return;
  }
  const vcf = activeContacts.map(c => `BEGIN:VCARD
VERSION:3.0
UID:uid-${c.phone}-${c.id}
FN:${c.name}
TEL:${c.phone}
${c.email ? `EMAIL:${c.email}` : ""}
${c.address ? `ADR:;;${c.address};;;;` : ""}
${c.birthday ? `BDAY:${c.birthday}` : ""}
END:VCARD`).join("\n\n");
  const blob = new Blob([vcf], { type: "text/vcard" });
  const url = URL.createObjectURL(blob);
  const qrApiUrl = `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(url)}`;
  qrCodeDiv.innerHTML = `<img src="${qrApiUrl}" alt="QR Code for All Contacts">`;
  const link = document.createElement('a');
  link.href = url;
  link.textContent = 'Download .vcf file';
  link.download = "contacts.vcf";
  link.className = 'btn btn-link';
  qrCodeDiv.appendChild(link);
}

async function handleDbImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        await DB.importDb(file);
        alert('Database imported successfully! The application will now reload.');
        window.location.reload();
    } catch (err) {
        console.error(err);
    }
}

// --- BULK ACTIONS ---
function handleBulkAction() {
    const selectedIds = Array.from(document.querySelectorAll('.contact-select:checked')).map(cb => cb.dataset.contactId);
    if (selectedIds.length === 0) return alert('Please select contacts first.');
    const action = document.getElementById('bulkActionSelect').value;
    if (!action) return alert('Please select an action.');
    const placeholders = selectedIds.map(() => '?').join(',');
    let sql;
    switch (action) {
        case 'archive':
            sql = `UPDATE contacts SET is_active = 0 WHERE id IN (${placeholders})`;
            DB.run(sql, selectedIds);
            break;
        case 'unarchive':
            sql = `UPDATE contacts SET is_active = 1 WHERE id IN (${placeholders})`;
            DB.run(sql, selectedIds);
            break;
        case 'add_category':
            const categoryId = document.getElementById('bulkCategorySelect').value;
            if (!categoryId) return alert('Please select a category for the bulk action.');
            sql = 'INSERT OR IGNORE INTO contact_categories (contact_id, category_id) VALUES (?, ?)';
            selectedIds.forEach(contactId => DB.run(sql, [contactId, categoryId]));
            break;
        default: return alert('Invalid bulk action.');
    }
    alert('Bulk action successful!');
    loadInitialData();
}

function populateCategoryFilter() {
    const select = document.getElementById('bulkCategorySelect');
    if(!select) return;
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// --- CATEGORY & CUSTOM FIELD MANAGEMENT ---
function renderCategoryList() {
    const list = document.getElementById('categoryList');
    list.innerHTML = categories.map(c => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            ${c.name}
            <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id})">Delete</button>
        </li>
    `).join('');
}

function addCategory(e) {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return;
    const result = DB.run('INSERT INTO categories (name) VALUES (?)', [name]);
    if (result.success) {
        document.getElementById('newCategoryName').value = '';
        categories = DB.exec('SELECT * FROM categories ORDER BY name');
        renderCategoryList();
        populateCategoryFilter();
    } else {
        alert('Failed to add category. It might already exist.');
    }
}

function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category? This will remove it from all contacts.')) {
        DB.run('DELETE FROM categories WHERE id = ?', [id]);
        categories = DB.exec('SELECT * FROM categories ORDER BY name');
        renderCategoryList();
        populateCategoryFilter();
        loadInitialData();
    }
}

function renderCustomFieldList() {
    const list = document.getElementById('customFieldList');
    list.innerHTML = customFieldDefs.map(f => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            ${f.field_name}
            <button class="btn btn-danger btn-sm" onclick="deleteCustomField(${f.id})">Delete</button>
        </li>
    `).join('');
}

function addCustomField(e) {
    e.preventDefault();
    const name = document.getElementById('newCustomFieldName').value.trim();
    if (!name) return;
    const result = DB.run('INSERT INTO custom_fields_definitions (field_name) VALUES (?)', [name]);
    if (result.success) {
        document.getElementById('newCustomFieldName').value = '';
        customFieldDefs = DB.exec('SELECT * FROM custom_fields_definitions ORDER BY field_name');
        renderCustomFieldList();
    } else {
        alert('Failed to add custom field. It might already exist.');
    }
}

function deleteCustomField(id) {
    if (confirm('Are you sure you want to delete this custom field? This will remove it and all its values from all contacts.')) {
        DB.run('DELETE FROM custom_fields_definitions WHERE id = ?', [id]);
        customFieldDefs = DB.exec('SELECT * FROM custom_fields_definitions ORDER BY field_name');
        renderCustomFieldList();
        loadInitialData();
    }
}