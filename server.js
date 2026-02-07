const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2'], // Replace with secure keys in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// Middleware: Check if authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
};

// Middleware: Check if Admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
};

// Middleware: Check if Partner
const isPartner = (req, res, next) => {
    if (req.session && (req.session.role === 'partner' || req.session.role === 'admin')) {
        return next();
    }
    res.status(403).json({ error: 'Forbidden' });
};

// Serve app from 'app' folder at /app route
app.use('/app', express.static('app'));

// Serve admin from 'admin' folder at /admin route
app.use('/admin', express.static('admin'));

// Serve login from 'login' folder at /login route
app.use('/login', express.static('login'));

// Serve landing page (static files in root) from root
app.use('/', express.static('.'));

// API: Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const passwordIsValid = bcrypt.compareSync(password, user.password_hash);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid credentials' });

        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({ message: 'Login successful', role: user.role });
    });
});

// API: Logout
app.post('/api/logout', (req, res) => {
    req.session = null;
    res.json({ message: 'Logout successful' });
});

// API: Create User (Partner) - Admin Only
app.post('/api/users', isAdmin, (req, res) => {
    const { username, password, pin_code } = req.body;
    const hash = bcrypt.hashSync(password, 8);

    db.run(`INSERT INTO users (username, password_hash, role, pin_code) VALUES (?, ?, 'partner', ?)`,
        [username, hash, pin_code],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ message: 'User created', id: this.lastID });
        }
    );
});

// API: Get Users (Partners) - Admin Only
app.get('/api/users', isAdmin, (req, res) => {
    db.all('SELECT id, username, role, pin_code, created_at FROM users WHERE role = "partner"', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// API: Get all vouchers (Filtered by Partner OR Booking)
app.get('/api/vouchers', (req, res) => {
    let sql = "SELECT * FROM vouchers";
    let params = [];

    // If partner, only show their own vouchers
    if (req.session && req.session.role === 'partner') {
        sql += " WHERE partner_id = ?";
        params.push(req.session.userId);
    }
    // If booking_code provided (Traveler View), filter by visibility
    else if (req.query.booking_code) {
        sql = `
            SELECT v.* 
            FROM vouchers v
            JOIN booking_vouchers bv ON v.id = bv.voucher_id
            JOIN bookings b ON bv.booking_id = b.id
            WHERE b.code = ?
        `;
        params.push(req.query.booking_code);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// API: Add a voucher
app.post('/api/vouchers', isPartner, (req, res) => {
    const { venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry } = req.body;
    const partner_id = req.session.role === 'partner' ? req.session.userId : null;

    const sql = `INSERT INTO vouchers (partner_id, venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [partner_id, venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID }
        });
    });
});

// API: Delete a voucher
app.delete('/api/vouchers/:id', (req, res) => {
    const sql = "DELETE FROM vouchers WHERE id = ?";
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({ "message": "deleted", changes: this.changes });
    });
});


// API: Get all bookings
app.get('/api/bookings', isAdmin, (req, res) => {
    const sql = "SELECT * FROM bookings";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// API: Create Booking with Vouchers
app.post('/api/bookings', isAdmin, (req, res) => {
    const { code, voucher_ids } = req.body;

    // 1. Create Booking
    db.run('INSERT INTO bookings (code) VALUES (?)', [code], function (err) {
        if (err) return res.status(400).json({ error: err.message });

        const bookingId = this.lastID;

        // 2. Link Vouchers (if provided)
        if (voucher_ids && voucher_ids.length > 0) {
            const stmt = db.prepare('INSERT INTO booking_vouchers (booking_id, voucher_id) VALUES (?, ?)');
            voucher_ids.forEach(vid => stmt.run(bookingId, vid));
            stmt.finalize();
        } else {
            // Default: Link ALL vouchers if none specified (optional, but safer to be explicit)
            db.all('SELECT id FROM vouchers', (err, vouchers) => {
                if (!err) {
                    const stmt = db.prepare('INSERT INTO booking_vouchers (booking_id, voucher_id) VALUES (?, ?)');
                    vouchers.forEach(v => stmt.run(bookingId, v.id));
                    stmt.finalize();
                }
            });
        }

        res.json({ message: 'Booking created', id: bookingId });
    });
});

// API: Delete Booking
app.delete('/api/bookings/:id', isAdmin, (req, res) => {
    // Cascade delete manually (SQLite foreign keys might not be enabled by default)
    db.run('DELETE FROM booking_vouchers WHERE booking_id = ?', [req.params.id], (err) => {
        if (!err) {
            db.run('DELETE FROM bookings WHERE id = ?', [req.params.id], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: 'deleted', changes: this.changes });
            });
        }
    });
});

// API: Get Vouchers for specific Booking (Admin View)
app.get('/api/bookings/:id/vouchers', isAdmin, (req, res) => {
    db.all('SELECT voucher_id FROM booking_vouchers WHERE booking_id = ?', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows.map(r => r.voucher_id) });
    });
});

// API: Update Vouchers for Booking
app.put('/api/bookings/:id/vouchers', isAdmin, (req, res) => {
    const { voucher_ids } = req.body;
    const bookingId = req.params.id;

    // Transaction-like: Delete old -> Insert new
    db.run('DELETE FROM booking_vouchers WHERE booking_id = ?', [bookingId], (err) => {
        if (err) return res.status(500).json({ error: err.message });

        const stmt = db.prepare('INSERT INTO booking_vouchers (booking_id, voucher_id) VALUES (?, ?)');
        voucher_ids.forEach(vid => stmt.run(bookingId, vid));
        stmt.finalize();

        res.json({ message: 'Vouchers updated' });
    });
});

// API: Validate booking code
app.post('/api/validate', (req, res) => {
    const { code } = req.body;
    const sql = "SELECT * FROM bookings WHERE code = ?";
    db.get(sql, [code], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (row) {
            res.json({ "valid": true });
        } else {
            res.json({ "valid": false });
        }
    });
});

// API: Redeem Voucher (Option B: Staff PIN)
app.post('/api/redeem', (req, res) => {
    const { voucher_id, booking_code, pin } = req.body;

    // 1. Get Booking ID
    db.get('SELECT id FROM bookings WHERE code = ?', [booking_code], (err, booking) => {
        if (err || !booking) return res.status(400).json({ error: 'Invalid booking code' });

        // 2. Get Voucher and Partner PIN
        db.get(`
            SELECT v.id, u.pin_code 
            FROM vouchers v 
            JOIN users u ON v.partner_id = u.id 
            WHERE v.id = ?`,
            [voucher_id], (err, voucher) => {

                if (err || !voucher) return res.status(400).json({ error: 'Voucher not found or invalid' });

                // 3. Verify PIN
                if (voucher.pin_code !== pin) {
                    return res.status(401).json({ error: 'Invalid Staff PIN' });
                }

                // 4. Record Redemption
                db.run('INSERT INTO redemptions (booking_id, voucher_id) VALUES (?, ?)',
                    [booking.id, voucher_id], (err) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({ success: true, message: 'Redemption successful!' });
                    });
            });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
