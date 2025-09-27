// --- UTILITIES ---

function showNotification(message, type = 'success') {
  const container = document.getElementById('notification-container');
  const alertType = type === 'success' ? 'alert-success' : 'alert-danger';
  const notification = document.createElement('div');
  notification.className = `alert ${alertType} alert-dismissible fade show`;
  notification.role = 'alert';
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  container.appendChild(notification);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    // Use a try-catch block in case the element is already gone
    try {
      const bootstrapAlert = new bootstrap.Alert(notification);
      bootstrapAlert.close();
    } catch (e) {
      // Ignore error if the element is already removed
    }
  }, 5000);
}


// --- AUTHENTICATION & PAGE SETUP ---

document.addEventListener('DOMContentLoaded', () => {
  handleAuthRedirect();
  if (document.getElementById('loginForm')) {
    setupAuthForms();
  } else {
    setupApp();
  }
});

const handleAuthRedirect = async () => {
  const { data: { session } } = await _supabase.auth.getSession();
  const onLoginPage = window.location.pathname.endsWith('login.html');
  if (session && onLoginPage) {
    window.location.href = 'index.html';
  } else if (!session && !onLoginPage) {
    window.location.href = 'login.html';
  }
};

function setupAuthForms() {
  const loginForm = document.getElementById('loginForm');
  const signUpForm = document.getElementById('signUpForm');
  const loginView = document.getElementById('loginView');
  const signUpView = document.getElementById('signUpView');
  const showSignUp = document.getElementById('showSignUp');
  const showLogin = document.getElementById('showLogin');

  showSignUp.addEventListener('click', (e) => { e.preventDefault(); loginView.style.display = 'none'; signUpView.style.display = 'block'; });
  showLogin.addEventListener('click', (e) => { e.preventDefault(); signUpView.style.display = 'none'; loginView.style.display = 'block'; });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { error } = await _supabase.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value,
    });
    if (error) document.getElementById('loginErrorMessage').textContent = error.message;
    else window.location.href = 'index.html';
  });

  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data, error } = await _supabase.auth.signUp({
      email: document.getElementById('signUpEmail').value,
      password: document.getElementById('signUpPassword').value,
    });
    if (error) {
      document.getElementById('signUpErrorMessage').textContent = error.message;
    } else {
      showNotification('Sign-up successful! Please check your email for a confirmation link.', 'success');
      signUpView.style.display = 'none';
      loginView.style.display = 'block';
    }
  });
}

async function setupApp() {
  document.getElementById('logoutButton').addEventListener('click', async () => {
    await _supabase.auth.signOut();
    window.location.href = 'login.html';
  });

  document.getElementById('searchInput').addEventListener('input', filterContacts);
  document.getElementById('addContactBtn').addEventListener('click', () => openContactModal());
  document.getElementById('filterToggle').addEventListener('change', loadInitialData);
  document.getElementById('bulkApplyBtn').addEventListener('click', handleBulkAction);
  document.getElementById('bulkActionSelect').addEventListener('change', (e) => {
    document.getElementById('bulkCategorySelect').style.display = e.target.value === 'add_category' ? 'block' : 'none';
  });
  document.getElementById('generateQrBtn').addEventListener('click', generateQRCode);
  document.getElementById('contactForm').addEventListener('submit', handleSaveContact);
  document.getElementById('addCategoryForm').addEventListener('submit', addCategory);
  document.getElementById('addCustomFieldForm').addEventListener('submit', addCustomField);
  document.getElementById('categoriesModal').addEventListener('show.bs.modal', renderCategoryList);
  document.getElementById('customFieldsModal').addEventListener('show.bs.modal', renderCustomFieldList);
  document.getElementById('importExcelInput').addEventListener('change', handleExcelImport);
  document.getElementById('exportVcfBtn').addEventListener('click', exportToVcf);
  document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);

  loadInitialData();
}


// --- GLOBAL STATE & DATA LOADING ---
let contacts = [];
let categories = [];
let customFieldDefs = [];

async function loadInitialData() {
  const isActiveFilter = document.getElementById('filterToggle').checked;

  const { data: contactsData, error } = await _supabase.from('contacts').select('*, contact_categories(categories(*)), custom_fields_values(custom_fields_definitions(*), value)').eq('is_active', isActiveFilter).order('name');
  if (error) {
    showNotification('Error loading contacts.', 'danger');
    return;
  }

  const [{ data: categoriesData }, { data: customFieldsData }] = await Promise.all([
      _supabase.from('categories').select('*').order('name'),
      _supabase.from('custom_fields_definitions').select('*').order('field_name')
  ]);

  categories = categoriesData;
  customFieldDefs = customFieldsData;

  contacts = contactsData.map(c => ({
      ...c,
      categories: c.contact_categories.map(cc => cc.categories),
      custom_fields: c.custom_fields_values.reduce((acc, cfv) => {
          acc[cfv.custom_fields_definitions.field_name] = cfv.value;
          return acc;
      }, {})
  }));

  renderContacts();
  populateCategoryFilter();
}

// --- RENDERING ---
function renderContacts(data = contacts) {
  const grid = document.getElementById('contactsGrid');
  grid.innerHTML = data.map(c => `
    <div class="contact-card">
      <input type="checkbox" class="contact-select" data-contact-id="${c.id}">
      <strong>${c.name}</strong> ${c.is_active ? '' : '<span class="badge bg-secondary">Archived</span>'}<br />
      📞 ${c.phone}<br />
      ${c.email ? `✉️ ${c.email}<br />` : ''}
      ${c.address ? `📍 ${c.address}<br />` : ''}
      ${c.birthday ? `🎂 ${c.birthday}<br />` : ''}
      <div class="mt-1">
        ${c.categories.map(cat => `<span class="badge bg-info me-1">${cat.name}</span>`).join('')}
      </div>
      ${renderCustomFields(c.custom_fields)}
      <hr>
      <button class="btn-small btn-primary" onclick="openContactModal(${c.id})">✏️ Edit</button>
      <button class="btn-small btn-danger" onclick="deleteContact(${c.id})">🗑 Delete</button>
    </div>
  `).join('');
}

function renderCustomFields(fields) {
    if (!fields || Object.keys(fields).length === 0) return '';
    let html = '<div class="mt-1"><strong>Details:</strong><br/>';
    for (const [key, value] of Object.entries(fields)) {
        html += `&bull; ${key}: ${value}<br/>`;
    }
    return html;
}

// --- CONTACT MANAGEMENT ---
async function handleSaveContact(e) {
  e.preventDefault();
  const editingId = document.getElementById('editingIndex').value;
  const contactData = {
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    address: document.getElementById('address').value.trim(),
    birthday: document.getElementById('birthday').value,
    is_active: document.getElementById('is_active').checked,
  };

  const { data: savedContact, error } = await _supabase.from('contacts').upsert({ id: editingId || undefined, ...contactData }).select().single();
  if (error) return showNotification(`Error saving contact: ${error.message}`, 'danger');

  const selectedCategoryIds = Array.from(document.getElementById('categories').selectedOptions).map(opt => opt.value);
  await _supabase.from('contact_categories').delete().eq('contact_id', savedContact.id);
  if (selectedCategoryIds.length) {
      const categoryLinks = selectedCategoryIds.map(catId => ({ contact_id: savedContact.id, category_id: catId }));
      await _supabase.from('contact_categories').insert(categoryLinks);
  }

  await _supabase.from('custom_fields_values').delete().eq('contact_id', savedContact.id);
  const customFieldValues = [];
  for (const field of customFieldDefs) {
      const input = document.getElementById(`custom_${field.id}`);
      if (input && input.value) {
          customFieldValues.push({ contact_id: savedContact.id, field_id: field.id, value: input.value });
      }
  }
  if (customFieldValues.length) {
      await _supabase.from('custom_fields_values').insert(customFieldValues);
  }

  showNotification('Contact saved successfully!', 'success');
  bootstrap.Modal.getInstance(document.getElementById('contactModal')).hide();
  loadInitialData();
}

async function deleteContact(id) {
  if (confirm("Are you sure you want to delete this contact?")) {
    await _supabase.from('contacts').delete().eq('id', id);
    showNotification('Contact deleted.', 'success');
    loadInitialData();
  }
}

function openContactModal(contactId = null) {
  document.getElementById('contactForm').reset();
  document.getElementById('editingIndex').value = '';
  document.getElementById('contactModalLabel').textContent = 'Add Contact';

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

      const assignedCategoryIds = contact.categories.map(c => c.id);
      Array.from(document.getElementById('categories').options).forEach(opt => {
        if (assignedCategoryIds.includes(parseInt(opt.value))) opt.selected = true;
      });

      customFieldDefs.forEach(field => {
          const input = document.getElementById(`custom_${field.id}`);
          if (input && contact.custom_fields && contact.custom_fields[field.field_name]) {
              input.value = contact.custom_fields[field.field_name];
          }
      });
    }
  }
  new bootstrap.Modal(document.getElementById('contactModal')).show();
}

// --- UI HELPERS ---
function filterContacts() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = contacts.filter(c => c.name.toLowerCase().includes(query) || c.phone.includes(query) || (c.email && c.email.toLowerCase().includes(query)));
  renderContacts(filtered);
}

function populateCategoriesDropdown() {
  const select = document.getElementById('categories');
  select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

function populateCustomFieldsForm() {
  const container = document.getElementById('customFieldsContainer');
  container.innerHTML = customFieldDefs.map(field => `
    <div class="mb-3"><label class="form-label">${field.field_name}</label>
    <input type="text" id="custom_${field.id}" class="form-control" /></div>
  `).join('');
}

// --- CATEGORY & CUSTOM FIELD MANAGEMENT ---
async function renderCategoryList() {
  const { data } = await _supabase.from('categories').select('*').order('name');
  const list = document.getElementById('categoryList');
  list.innerHTML = data.map(c => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      ${c.name} <button class="btn btn-danger btn-sm" onclick="deleteCategory(${c.id})">Delete</button>
    </li>`).join('');
}

async function addCategory(e) {
  e.preventDefault();
  const name = document.getElementById('newCategoryName').value.trim();
  if (!name) return;
  await _supabase.from('categories').insert({ name });
  document.getElementById('newCategoryName').value = '';
  showNotification('Category added.', 'success');
  renderCategoryList();
  loadInitialData();
}

async function deleteCategory(id) {
  if (confirm('Are you sure you want to delete this category?')) {
    await _supabase.from('categories').delete().eq('id', id);
    showNotification('Category deleted.', 'success');
    renderCategoryList();
    loadInitialData();
  }
}

async function renderCustomFieldList() {
  const { data } = await _supabase.from('custom_fields_definitions').select('*').order('field_name');
  const list = document.getElementById('customFieldList');
  list.innerHTML = data.map(f => `
    <li class="list-group-item d-flex justify-content-between align-items-center">
      ${f.field_name} <button class="btn btn-danger btn-sm" onclick="deleteCustomField(${f.id})">Delete</button>
    </li>`).join('');
}

async function addCustomField(e) {
  e.preventDefault();
  const name = document.getElementById('newCustomFieldName').value.trim();
  if (!name) return;
  await _supabase.from('custom_fields_definitions').insert({ field_name: name });
  document.getElementById('newCustomFieldName').value = '';
  showNotification('Custom field added.', 'success');
  renderCustomFieldList();
  loadInitialData();
}

async function deleteCustomField(id) {
  if (confirm('Are you sure you want to delete this custom field?')) {
    await _supabase.from('custom_fields_definitions').delete().eq('id', id);
    showNotification('Custom field deleted.', 'success');
    renderCustomFieldList();
    loadInitialData();
  }
}

// --- BULK ACTIONS & QR CODE ---
async function handleBulkAction() {
    const selectedIds = Array.from(document.querySelectorAll('.contact-select:checked')).map(cb => cb.dataset.contactId);
    if (selectedIds.length === 0) return showNotification('Please select contacts first.', 'danger');
    const action = document.getElementById('bulkActionSelect').value;

    switch (action) {
        case 'archive':
            await _supabase.from('contacts').update({ is_active: false }).in('id', selectedIds);
            break;
        case 'unarchive':
            await _supabase.from('contacts').update({ is_active: true }).in('id', selectedIds);
            break;
        case 'add_category':
            const categoryId = document.getElementById('bulkCategorySelect').value;
            if (!categoryId) return showNotification('Please select a category.', 'danger');
            const links = selectedIds.map(id => ({ contact_id: id, category_id: categoryId }));
            await _supabase.from('contact_categories').insert(links);
            break;
        default: return showNotification('Invalid bulk action selected.', 'danger');
    }
    showNotification('Bulk action completed successfully!', 'success');
    loadInitialData();
}

function populateCategoryFilter() {
    const select = document.getElementById('bulkCategorySelect');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function generateQRCode() {
  const qrCodeDiv = document.getElementById('qrCode');
  qrCodeDiv.innerHTML = 'Generating...';
  const { data: activeContacts, error: contactsError } = await _supabase.from('contacts').select('*').eq('is_active', true);

  if (contactsError) {
      return showNotification(`Error fetching contacts: ${contactsError.message}`, 'danger');
  }
  if (!activeContacts || activeContacts.length === 0) {
    qrCodeDiv.innerHTML = 'No active contacts to generate a QR code for.';
    return;
  }

  const vcf = activeContacts.map(c => `BEGIN:VCARD
VERSION:3.0
FN:${c.name}
TEL:${c.phone}
${c.email ? `EMAIL:${c.email}` : ''}
${c.address ? `ADR;CHARSET=utf-8:;;${c.address};;;;` : ''}
${c.birthday ? `BDAY:${c.birthday.replace(/-/g, '')}` : ''}
END:VCARD`).join('\n\n');

  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
  const fileName = `contacts-${Date.now()}.vcf`;

  // Upload the VCF file to Supabase Storage
  const { data: uploadData, error: uploadError } = await _supabase.storage
    .from('vcf-files')
    .upload(fileName, blob, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    qrCodeDiv.innerHTML = 'Error uploading contact file.';
    return showNotification(`Storage Error: ${uploadError.message}`, 'danger');
  }

  // Get the public URL of the uploaded file
  const { data: urlData } = _supabase.storage
    .from('vcf-files')
    .getPublicUrl(fileName);

  if (!urlData || !urlData.publicUrl) {
      qrCodeDiv.innerHTML = 'Error getting public URL for the contact file.';
      return;
  }

  const publicUrl = urlData.publicUrl;

  try {
    const typeNumber = 0;
    const errorCorrectionLevel = 'L';
    const qr = qrcode(typeNumber, errorCorrectionLevel);
    qr.addData(publicUrl);
    qr.make();

    qrCodeDiv.innerHTML = qr.createImgTag(4, 8);

    const link = document.createElement('a');
    link.href = publicUrl;
    link.textContent = 'Download .vcf file';
    link.download = 'contacts.vcf';
    link.className = 'btn btn-link d-block mt-2';
    qrCodeDiv.appendChild(link);

  } catch (err) {
    qrCodeDiv.innerHTML = 'Error generating QR code.';
  }
}

// --- IMPORT / EXPORT ---

async function handleExcelImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) return showNotification('The selected Excel file is empty.', 'danger');

      const { data: existingContacts, error } = await _supabase.from('contacts').select('phone');
      if (error) throw error;
      const existingPhones = new Set(existingContacts.map(c => c.phone));

      const newContacts = [];
      for (const row of json) {
        const lowerRow = Object.keys(row).reduce((acc, key) => { acc[key.toLowerCase()] = row[key]; return acc; }, {});
        const phone = (lowerRow.phone || lowerRow['phone number'] || lowerRow.mobile || '').toString().trim();
        if (!phone || existingPhones.has(phone)) continue;

        newContacts.push({
          name: lowerRow.name || lowerRow['full name'] || '',
          phone: phone,
          email: lowerRow.email || lowerRow['email address'] || '',
          address: lowerRow.address || '',
          birthday: lowerRow.birthday || '',
        });
        existingPhones.add(phone);
      }

      if (newContacts.length > 0) {
        const { error: insertError } = await _supabase.from('contacts').insert(newContacts);
        if (insertError) throw insertError;
        showNotification(`${newContacts.length} new contacts were successfully imported!`, 'success');
      } else {
        showNotification('No new contacts were found to import.', 'success');
      }

      loadInitialData();
    } catch (err) {
      showNotification(`An error occurred during the import: ${err.message}`, 'danger');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsArrayBuffer(file);
}

async function exportToVcf() {
    const { data: contacts, error } = await _supabase.from('contacts').select('*');
    if (error) return showNotification(`Error fetching contacts: ${error.message}`, 'danger');
    if (!contacts || contacts.length === 0) return showNotification('No contacts to export.', 'danger');

    const vcf = contacts.map(c => `BEGIN:VCARD
VERSION:3.0
FN:${c.name}
TEL;TYPE=CELL:${c.phone}
${c.email ? `EMAIL:${c.email}` : ''}
${c.address ? `ADR;CHARSET=utf-8:;;${c.address};;;;` : ''}
${c.birthday ? `BDAY:${c.birthday.replace(/-/g, '')}` : ''}
END:VCARD`).join('\n\n');

    const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contacts.vcf';
    a.click();
    URL.revokeObjectURL(url);
}

async function exportToExcel() {
    const { data: contacts, error } = await _supabase.from('contacts').select('*, contact_categories(categories(name)), custom_fields_values(value, custom_fields_definitions(field_name))');
    if (error) return showNotification(`Error fetching contacts: ${error.message}`, 'danger');
    if (!contacts || contacts.length === 0) return showNotification('No contacts to export.', 'danger');

    const dataForSheet = contacts.map(c => {
        const contactRow = {
            Name: c.name,
            Phone: c.phone,
            Email: c.email,
            Address: c.address,
            Birthday: c.birthday,
            Is_Active: c.is_active,
            Categories: c.contact_categories.map(cat => cat.categories.name).join(', '),
        };

        c.custom_fields_values.forEach(cfv => {
            contactRow[cfv.custom_fields_definitions.field_name] = cfv.value;
        });

        return contactRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
    XLSX.writeFile(workbook, 'contacts_export.xlsx');
}