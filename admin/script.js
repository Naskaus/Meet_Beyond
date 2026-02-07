const bookingForm = document.getElementById('booking-form');
const bookingsList = document.getElementById('booking-list');
const voucherForm = document.getElementById('voucher-form');
const vouchersList = document.getElementById('voucher-list');
const partnerForm = document.getElementById('partner-form');
const partnerList = document.getElementById('partner-list');

let currentUserRole = '';

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
                    <strong>${b.code}</strong> <br>
                    <small>ID: ${b.id}</small> 
                    <button class="button button-small delete-btn" onclick="deleteBooking(${b.id})" style="float:right; margin-top:-20px;">X</button>
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
    fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    }).then(() => {
        bookingForm.reset();
        loadBookings();
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
