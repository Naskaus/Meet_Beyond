const bookingForm = document.getElementById('booking-form');
const bookingsList = document.getElementById('booking-list');
const voucherForm = document.getElementById('voucher-form');
const vouchersList = document.getElementById('voucher-list');
const partnerForm = document.getElementById('partner-form');
const partnerList = document.getElementById('partner-list');
const voucherChecklist = document.getElementById('voucher-checklist');
const editVoucherChecklist = document.getElementById('edit-voucher-checklist');

let currentUserRole = '';
let allVouchers = [];

// --- Auth Check ---
async function checkAuth() {
    try {
        // We assume session cookie exists. If 401/403 API calls will fail.
        // But better to check access by trying to fetch something or a dedicated /me endpoint.
        // For V1 we'll try to fetch vouchers. If 401 -> redirect to login.
        const res = await fetch('/api/vouchers');
        if (res.status === 401) {
            window.location.replace('/login/');
            return;
        }

        // Determinate Role (Hack: Try to fetch users. If 403, we are partner)
        const userRes = await fetch('/api/users');
        if (userRes.ok) {
            currentUserRole = 'admin';
            document.getElementById('admin-section').style.display = 'block';
            document.getElementById('bookings-section').style.display = 'block';
            loadPartners();
            loadBookings();
            loadVouchersForChecklist(); // For Admin
        } else {
            currentUserRole = 'partner';
        }

        loadVouchers();
    } catch (e) {
        console.error(e);
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login/';
}

// --- Loaders ---
function loadVouchersForChecklist() {
    fetch('/api/vouchers')
        .then(res => res.json())
        .then(data => {
            allVouchers = data.data;
            renderChecklist(voucherChecklist, allVouchers, true); // true = all checked by default
        });
}

function renderChecklist(container, vouchers, checked = false) {
    container.innerHTML = vouchers.map(v => `
        <label style="font-weight:normal; font-size:14px; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" value="${v.id}" ${checked ? 'checked' : ''} data-cat="${v.destination}">
            ${v.venue} <span style="color:#666; font-size:12px;">(${v.destination})</span>
        </label>
    `).join('');
}

// Helpers
window.selectAllVouchers = (select) => {
    voucherChecklist.querySelectorAll('input').forEach(cb => cb.checked = select);
}
window.selectVouchersByCat = (cat) => {
    voucherChecklist.querySelectorAll('input').forEach(cb => {
        cb.checked = cb.dataset.cat === cat;
    });
}
// Edit Helpers
window.selectEditVouchers = (select) => {
    editVoucherChecklist.querySelectorAll('input').forEach(cb => cb.checked = select);
}


function loadPartners() {
    fetch('/api/users')
        .then(res => res.json())
        .then(data => {
            partnerList.innerHTML = data.data.map(u => `
                <div class="card">
                    <strong>${u.username}</strong> <br>
                    <small>PIN: ${u.pin_code}</small>
                </div>
            `).join('');
        });
}

function loadBookings() {
    fetch('/api/bookings')
        .then(res => res.json())
        .then(data => {
            bookingsList.innerHTML = data.data.map(b => `
                <div class="card" style="display:flex; align-items:center; justify-content:space-between; padding:16px; margin-bottom:12px; border-radius:12px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    <div>
                        <strong style="font-size:18px; color:#111;">${b.code}</strong>
                        <div style="font-size:12px; color:#666; margin-top:4px;">ID: ${b.id}</div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="button button-small button-outline" onclick="openEditBooking(${b.id})" style="padding:8px 16px; border-radius:8px;">Edit</button>
                        <button onclick="deleteBooking(${b.id})" style="width:36px; height:36px; border:none; background:#fee2e2; color:#dc2626; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/></svg>
                        </button>
                    </div>
                </div>
            `).join('');
        })
        .catch(err => console.error('Failed to load bookings:', err));
}

function loadVouchers() {
    fetch('/api/vouchers')
        .then(res => res.json())
        .then(data => {
            vouchersList.innerHTML = data.data.map(v => `
                <div class="card" style="display:flex; align-items:center; gap:12px; padding:16px; margin-bottom:12px; border-radius:12px; background:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                    ${v.image_url ? `<img src="${v.image_url}" style="width:56px; height:56px; object-fit:cover; border-radius:8px; flex-shrink:0;">` : '<div style="width:56px; height:56px; background:linear-gradient(135deg,#667eea,#764ba2); border-radius:8px; flex-shrink:0;"></div>'}
                    <div style="flex:1; min-width:0;">
                        <strong style="font-size:16px; color:#111; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${v.venue}</strong>
                        <div style="font-size:13px; color:#666;">${v.discount}</div>
                        <div style="font-size:11px; color:#999; margin-top:2px;">${v.category} • ID: ${v.id}</div>
                    </div>
                    <div style="display:flex; gap:8px; flex-shrink:0;">
                        <button class="button button-small button-outline" onclick="openEditVoucher(${v.id})" style="padding:8px 12px; border-radius:8px; font-size:12px;">Edit</button>
                        <button onclick="deleteVoucher(${v.id})" style="width:36px; height:36px; border:none; background:#fee2e2; color:#dc2626; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.2s;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6"/></svg>
                        </button>
                    </div>
                </div>
            `).join('');
        })
        .catch(err => console.error('Failed to load vouchers:', err));
}


// --- Edit Modal Logic ---
window.openEditBooking = async (id) => {
    document.getElementById('edit-booking-id').value = id;
    document.getElementById('modal-edit-booking').style.display = 'flex';

    // 1. Render all vouchers checklist (unchecked)
    renderChecklist(editVoucherChecklist, allVouchers, false);

    // 2. Fetch enabled vouchers for this booking
    const res = await fetch(`/api/bookings/${id}/vouchers`);
    const data = await res.json();
    const enabledIds = data.data; // Array of IDs

    // 3. Mark checked
    editVoucherChecklist.querySelectorAll('input').forEach(cb => {
        if (enabledIds.includes(parseInt(cb.value))) {
            cb.checked = true;
        }
    });
}

window.closeEditModal = () => {
    document.getElementById('modal-edit-booking').style.display = 'none';
}

window.saveBookingVisibility = async () => {
    const id = document.getElementById('edit-booking-id').value;
    const selected = Array.from(editVoucherChecklist.querySelectorAll('input:checked')).map(cb => cb.value);

    await fetch(`/api/bookings/${id}/vouchers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voucher_ids: selected })
    });

    closeEditModal();
    alert('Visibility updated!');
}


// --- Actions ---
if (partnerForm) {
    partnerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('p-username').value;
        const password = document.getElementById('p-password').value;
        const pin_code = document.getElementById('p-pin').value;

        fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, pin_code })
        }).then(() => {
            partnerForm.reset();
            loadPartners();
        });
    });
}

bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('booking-code').value;
    // Get Selected Vouchers
    const selectedVouchers = Array.from(voucherChecklist.querySelectorAll('input:checked')).map(cb => cb.value);

    fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, voucher_ids: selectedVouchers })
    }).then(() => {
        bookingForm.reset();
        loadBookings();
        // Reset checklist to all checked
        selectAllVouchers(true);
    });
});

voucherForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Use FormData for multipart upload (images)
    const formData = new FormData();
    formData.append('venue', document.getElementById('v-venue').value);
    formData.append('category', document.getElementById('v-category').value);
    formData.append('categoryLabel', document.getElementById('v-category').options[document.getElementById('v-category').selectedIndex].text);
    formData.append('discount', document.getElementById('v-discount').value);
    formData.append('location', document.getElementById('v-location').value);
    formData.append('destination', document.getElementById('v-destination').value);
    formData.append('shortDesc', document.getElementById('v-shortDesc').value);
    formData.append('fullDesc', document.getElementById('v-fullDesc').value);
    formData.append('terms', document.getElementById('v-terms').value);
    formData.append('expiry', document.getElementById('v-expiry').value);

    // Add images if selected
    const imageFile = document.getElementById('voucher-image').files[0];
    const logoFile = document.getElementById('voucher-logo').files[0];
    if (imageFile) formData.append('image', imageFile);
    if (logoFile) formData.append('logo', logoFile);

    fetch('/api/vouchers', {
        method: 'POST',
        body: formData  // No Content-Type header - browser sets it with boundary
    }).then(() => {
        voucherForm.reset();
        loadVouchers();
        loadVouchersForChecklist(); // Refresh checklist too
    });
});

window.deleteBooking = async (id) => {
    if (!confirm('🗑️ Delete this booking code? This cannot be undone.')) return;

    try {
        const res = await fetch(`/api/bookings/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || 'Server error');
        }

        // Success - reload list
        loadBookings();
        console.log('✅ Booking deleted:', id);
    } catch (err) {
        console.error('❌ Delete failed:', err);
        alert('Delete failed: ' + err.message);
    }
};

window.deleteVoucher = async (id) => {
    if (!confirm('🗑️ Delete this voucher? This cannot be undone.')) return;

    try {
        const res = await fetch(`/api/vouchers/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();

        if (!res.ok || data.error) {
            throw new Error(data.error || 'Server error');
        }

        // Success - reload lists
        loadVouchers();
        loadVouchersForChecklist();
        console.log('✅ Voucher deleted:', id);
    } catch (err) {
        console.error('❌ Delete failed:', err);
        alert('Delete failed: ' + err.message);
    }
};

// --- Edit Voucher Modal Logic ---
let editingVoucherId = null;

window.openEditVoucher = async (id) => {
    editingVoucherId = id;
    // Fetch voucher data
    const res = await fetch('/api/vouchers');
    const data = await res.json();
    const voucher = data.data.find(v => v.id === id);
    if (!voucher) return alert('Voucher not found');

    // Populate form
    document.getElementById('edit-v-venue').value = voucher.venue || '';
    document.getElementById('edit-v-category').value = voucher.category || 'food';
    document.getElementById('edit-v-discount').value = voucher.discount || '';
    document.getElementById('edit-v-location').value = voucher.location || '';
    document.getElementById('edit-v-destination').value = voucher.destination || '';
    document.getElementById('edit-v-shortDesc').value = voucher.shortDesc || '';
    document.getElementById('edit-v-fullDesc').value = voucher.fullDesc || '';
    document.getElementById('edit-v-terms').value = voucher.terms || '';
    document.getElementById('edit-v-expiry').value = voucher.expiry || '';

    document.getElementById('modal-edit-voucher').style.display = 'flex';
};

window.closeEditVoucherModal = () => {
    document.getElementById('modal-edit-voucher').style.display = 'none';
    editingVoucherId = null;
};

window.saveVoucher = async () => {
    if (!editingVoucherId) return;

    const formData = new FormData();
    formData.append('venue', document.getElementById('edit-v-venue').value);
    formData.append('category', document.getElementById('edit-v-category').value);
    formData.append('categoryLabel', document.getElementById('edit-v-category').options[document.getElementById('edit-v-category').selectedIndex].text);
    formData.append('discount', document.getElementById('edit-v-discount').value);
    formData.append('location', document.getElementById('edit-v-location').value);
    formData.append('destination', document.getElementById('edit-v-destination').value);
    formData.append('shortDesc', document.getElementById('edit-v-shortDesc').value);
    formData.append('fullDesc', document.getElementById('edit-v-fullDesc').value);
    formData.append('terms', document.getElementById('edit-v-terms').value);
    formData.append('expiry', document.getElementById('edit-v-expiry').value);

    // Add images if selected
    const imageFile = document.getElementById('edit-voucher-image').files[0];
    const logoFile = document.getElementById('edit-voucher-logo').files[0];
    if (imageFile) formData.append('image', imageFile);
    if (logoFile) formData.append('logo', logoFile);

    await fetch(`/api/vouchers/${editingVoucherId}`, {
        method: 'PUT',
        body: formData
    });

    closeEditVoucherModal();
    loadVouchers();
    loadVouchersForChecklist();
    alert('Voucher updated!');
};

// --- Init ---
checkAuth();
