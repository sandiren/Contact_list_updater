// Global state
let contacts = [];
let categories = [];
let customFieldDefs = [];
let currentFilter = { active: true }; // Default to show active contacts

// Check login status on page load
document.addEventListener('DOMContentLoaded', () => {
    checkSessionAndLoadData();

    // Modal handling
    const contactModal = document.getElementById('contactModal');
    contactModal.addEventListener('hidden.bs.modal', resetForm);

    // Form submission
    document.getElementById('contactForm').addEventListener('submit', handleSaveContact);
});

async function checkSessionAndLoadData() {
    // This is a simplified check. In a real app, you'd have a dedicated /api/session endpoint.
    // For now, we assume if we can fetch contacts, we are logged in.
    try {
        await loadInitialData();
        // If successful, setup UI listeners
        setupUIEventListeners();
    } catch (error) {
        // If fetching fails, it's likely due to not being authenticated
        console.error("Authentication check failed. Redirecting to login.");
        window.location.href = '/login.html';
    }
}

async function loadInitialData() {
    const [contactsRes, categoriesRes, customFieldsRes] = await Promise.all([
        fetchWithAuth(`/contacts?active=${currentFilter.active}`),
        fetchWithAuth('/categories'),
        fetchWithAuth('/custom-fields')
    ]);

    if (!contactsRes.ok) throw new Error('Failed to fetch contacts');

    contacts = await contactsRes.json();
    categories = await categoriesRes.json();
    customFieldDefs = await customFieldsRes.json();

    renderContacts();
    populateCategoryFilter();
}

function setupUIEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterContacts);
    document.getElementById('logoutButton').addEventListener('click', logout);
    document.getElementById('addContactBtn').addEventListener('click', () => openContactModal());
    document.getElementById('filterToggle').addEventListener('change', toggleActiveFilter);
    // Add more listeners for new UI elements like category management, etc.
}

// --- RENDERING ---

function renderContacts(data = contacts) {
    const grid = document.getElementById('contactsGrid');
    grid.innerHTML = data.map((c, i) => `
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

// --- DATA FETCHING & MANIPULATION ---

async function handleSaveContact(e) {
    e.preventDefault();
    const editingId = document.getElementById('editingIndex').value;

    const contactData = {
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim(),
        birthday: document.getElementById('birthday').value,
        is_active: document.getElementById('is_active').checked ? 1 : 0,
        categories: Array.from(document.getElementById('categories').selectedOptions).map(opt => opt.value),
        custom_fields: {}
    };

    customFieldDefs.forEach(field => {
        const input = document.getElementById(`custom_${field.id}`);
        if(input) contactData.custom_fields[field.id] = input.value;
    });

    const url = editingId ? `/contacts/${editingId}` : '/contacts';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
    });

    if (response.ok) {
        bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
        loadInitialData(); // Reload all data
    } else {
        const err = await response.json();
        alert(`Error: ${err.message}`);
    }
}

async function deleteContact(id) {
    if (confirm("Are you sure you want to delete this contact?")) {
        const response = await fetchWithAuth(`/contacts/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadInitialData();
        } else {
            alert('Failed to delete contact.');
        }
    }
}

async function openContactModal(contactId = null) {
    resetForm();
    populateCategoriesDropdown();
    populateCustomFieldsForm();

    if (contactId) {
        const contact = contacts.find(c => c.id === contactId);
        if (contact) {
            document.getElementById('editingIndex').value = contact.id;
            document.getElementById('contactModalLabel').textContent = 'Edit Contact';
            document.getElementById('name').value = contact.name;
            document.getElementById('phone').value = contact.phone;
            document.getElementById('email').value = contact.email || '';
            document.getElementById('address').value = contact.address || '';
            document.getElementById('birthday').value = contact.birthday || '';
            document.getElementById('is_active').checked = contact.is_active;

            // Select assigned categories
            const assignedCategories = contact.categories ? contact.categories.split(',') : [];
            const categoryIds = categories.filter(c => assignedCategories.includes(c.name)).map(c => c.id);
            Array.from(document.getElementById('categories').options).forEach(opt => {
                if (categoryIds.includes(parseInt(opt.value))) {
                    opt.selected = true;
                }
            });

            // Populate custom fields
            customFieldDefs.forEach(field => {
                const input = document.getElementById(`custom_${field.id}`);
                if (input && contact.custom_fields && contact.custom_fields[field.field_name]) {
                    input.value = contact.custom_fields[field.field_name];
                }
            });
        }
    } else {
        document.getElementById('contactModalLabel').textContent = 'Add Contact';
    }

    new bootstrap.Modal(document.getElementById('contactModal')).show();
}

function resetForm() {
    document.getElementById('contactForm').reset();
    document.getElementById('editingIndex').value = '';
    document.getElementById('is_active').checked = true;
    document.getElementById('customFieldsContainer').innerHTML = '';
}

// --- UI HELPERS & FILTERS ---

function filterContacts() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
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
        <div class="mb-3">
            <label class="form-label">${field.field_name}</label>
            <input type="${field.field_type === 'DATE' ? 'date' : 'text'}" id="custom_${field.id}" class="form-control" />
        </div>
    `).join('');
}


// --- AUTHENTICATION ---

async function logout() {
    await fetchWithAuth('/logout', { method: 'POST' });
    window.location.href = '/login.html';
}

// Wrapper for fetch to handle auth errors
async function fetchWithAuth(url, options = {}) {
    const response = await fetch(`http://localhost:3000${url}`, options);
    if (response.status === 401) {
        // Unauthorized, redirect to login
        window.location.href = '/login.html';
        throw new Error('Unauthorized');
    }
    return response;
}

// --- New Feature Implementations ---

// QR Code
async function generateQRCode() {
  const qrCodeDiv = document.getElementById('qrCode');
  qrCodeDiv.innerHTML = 'Generating...';
  // The backend endpoint now directly serves the .vcf file
  // We will generate a QR code that links to this endpoint.
  const url = `http://localhost:3000/qr-code-vcf`;
  const qrApiUrl = `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(url)}`;
  qrCodeDiv.innerHTML = `<img src="${qrApiUrl}" alt="QR Code for All Contacts">`;
  // Add a helpful link to download directly
  const link = document.createElement('a');
  link.href = url;
  link.textContent = 'Download .vcf file';
  link.className = 'btn btn-link';
  qrCodeDiv.appendChild(link);
}

// Bulk Actions
async function handleBulkAction() {
    const selectedIds = Array.from(document.querySelectorAll('.contact-select:checked')).map(cb => cb.dataset.contactId);
    if (selectedIds.length === 0) return alert('Please select contacts first.');

    const action = document.getElementById('bulkActionSelect').value;
    if (!action) return alert('Please select an action.');

    let body = { contactIds: selectedIds };
    if (action === 'add_category') {
        const categoryId = document.getElementById('bulkCategorySelect').value;
        if (!categoryId) return alert('Please select a category for the bulk action.');
        body.action = 'add_category';
        body.categoryId = categoryId;
    } else {
        body.action = action; // 'archive' or 'unarchive'
    }

    const response = await fetchWithAuth('/contacts/bulk-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (response.ok) {
        alert('Bulk action successful!');
        loadInitialData();
    } else {
        alert('Bulk action failed.');
    }
}

// Populate category dropdown for bulk actions
function populateCategoryFilter() {
    const select = document.getElementById('bulkCategorySelect');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

// --- CATEGORY & CUSTOM FIELD MANAGEMENT ---

document.addEventListener('DOMContentLoaded', () => {
    // ... existing listeners

    // Management Modals
    const categoriesModal = document.getElementById('categoriesModal');
    categoriesModal.addEventListener('show.bs.modal', renderCategoryList);
    document.getElementById('addCategoryForm').addEventListener('submit', addCategory);

    const customFieldsModal = document.getElementById('customFieldsModal');
    customFieldsModal.addEventListener('show.bs.modal', renderCustomFieldList);
    document.getElementById('addCustomFieldForm').addEventListener('submit', addCustomField);
});


// Category Management
async function renderCategoryList() {
    const list = document.getElementById('categoryList');
    list.innerHTML = categories.map(c => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            ${c.name}
            <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id})">Delete</button>
        </li>
    `).join('');
}

async function addCategory(e) {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value.trim();
    if (!name) return;

    const response = await fetchWithAuth('/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    });

    if (response.ok) {
        document.getElementById('newCategoryName').value = '';
        categories.push(await response.json());
        renderCategoryList();
        populateCategoryFilter(); // Update bulk action dropdown
    } else {
        alert('Failed to add category. It might already exist.');
    }
}

async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category? This will remove it from all contacts.')) {
        const response = await fetchWithAuth(`/categories/${id}`, { method: 'DELETE' });
        if (response.ok) {
            categories = categories.filter(c => c.id !== id);
            renderCategoryList();
            populateCategoryFilter();
            loadInitialData(); // Reload contacts to reflect category changes
        } else {
            alert('Failed to delete category.');
        }
    }
}

// Custom Field Management
async function renderCustomFieldList() {
    const list = document.getElementById('customFieldList');
    list.innerHTML = customFieldDefs.map(f => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            ${f.field_name}
            <button class="btn btn-danger btn-sm" onclick="deleteCustomField(${f.id})">Delete</button>
        </li>
    `).join('');
}

async function addCustomField(e) {
    e.preventDefault();
    const name = document.getElementById('newCustomFieldName').value.trim();
    if (!name) return;

    const response = await fetchWithAuth('/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field_name: name })
    });

    if (response.ok) {
        document.getElementById('newCustomFieldName').value = '';
        customFieldDefs.push(await response.json());
        renderCustomFieldList();
    } else {
        alert('Failed to add custom field. It might already exist.');
    }
}

async function deleteCustomField(id) {
    if (confirm('Are you sure you want to delete this custom field? This will remove it and all its values from all contacts.')) {
        const response = await fetchWithAuth(`/custom-fields/${id}`, { method: 'DELETE' });
        if (response.ok) {
            customFieldDefs = customFieldDefs.filter(f => f.id !== id);
            renderCustomFieldList();
            loadInitialData(); // Reload contacts to reflect field changes
        } else {
            alert('Failed to delete custom field.');
        }
    }
}