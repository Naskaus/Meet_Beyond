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
            window.location.href = '/login/';
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
                <div class="card">
                    <strong>${b.code}</strong> 
                    <button class="button button-small delete-btn" onclick="deleteBooking(${b.id})" style="float:right; margin-left:10px;">X</button>
                    <button class="button button-small button-outline" onclick="openEditBooking(${b.id})" style="float:right;">Edit</button>
                    <br><small>ID: ${b.id}</small> 
                </div>
            `).join('');
        });
}

function loadVouchers() {
    fetch('/api/vouchers')
        .then(res => res.json())
        .then(data => {
            vouchersList.innerHTML = data.data.map(v => `
                <div class="card">
                    <strong>${v.venue}</strong> (${v.category}) <br>
                    <em>${v.discount}</em> <br>
                    <small>ID: ${v.id}</small>
                    <button class="button button-small delete-btn" onclick="deleteVoucher(${v.id})" style="float:right; margin-top:-20px;">X</button>
                </div>
            `).join('');
        });
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
    const voucher = {
        venue: document.getElementById('v-venue').value,
        category: document.getElementById('v-category').value,
        categoryLabel: document.getElementById('v-category').options[document.getElementById('v-category').selectedIndex].text,
        discount: document.getElementById('v-discount').value,
        location: document.getElementById('v-location').value,
        destination: document.getElementById('v-destination').value,
        shortDesc: document.getElementById('v-shortDesc').value,
        fullDesc: document.getElementById('v-fullDesc').value,
        terms: document.getElementById('v-terms').value,
        expiry: document.getElementById('v-expiry').value
    };

    fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voucher)
    }).then(() => {
        voucherForm.reset();
        loadVouchers();
    });
});

window.deleteBooking = (id) => {
    if (!confirm('Delete this booking code?')) return;
    fetch(`/api/bookings/${id}`, { method: 'DELETE' }).then(loadBookings);
};

window.deleteVoucher = (id) => {
    if (!confirm('Delete this voucher?')) return;
    fetch(`/api/vouchers/${id}`, { method: 'DELETE' }).then(loadVouchers);
};

// --- Init ---
checkAuth();
