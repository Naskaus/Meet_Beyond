const express = require('express');

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, p) => {
    console.error('UNHANDLED REJECTION:', reason);
});

const bodyParser = require('body-parser');
const cors = require('cors');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const db = require('./database');
const path = require('path');
const multer = require('multer');

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

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

// Serve uploaded images
app.use('/uploads', express.static('public/uploads'));

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
// API: Get vouchers (with visibility check & redemption status)
app.get('/api/vouchers', (req, res) => {
    // Security Check: Require Session OR Booking Code
    const isPartner = req.session && req.session.role === 'partner';
    const isAdmin = req.session && req.session.role === 'admin';
    const hasBookingCode = req.query.booking_code;

    if (!isPartner && !isAdmin && !hasBookingCode) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Traveler View: If booking_code provided, check visibility AND redemption status
    if (hasBookingCode) {
        db.get('SELECT id FROM bookings WHERE code = ?', [req.query.booking_code], (err, booking) => {
            if (err || !booking) return res.status(401).json({ error: 'Invalid booking code' });

            const bookingId = booking.id;

            // Get vouchers linked to this booking, including redemption status
            const sql = `
                SELECT v.*, 
                       CASE WHEN r.id IS NOT NULL THEN 1 ELSE 0 END as is_redeemed
                FROM vouchers v
                JOIN booking_vouchers bv ON v.id = bv.voucher_id
                LEFT JOIN redemptions r ON v.id = r.voucher_id AND r.booking_id = ?
                WHERE bv.booking_id = ?
            `;

            db.all(sql, [bookingId, bookingId], (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ "message": "success", "data": rows });
            });
        });
        return;
    }

    // Admin/Partner View
    let sql = "SELECT * FROM vouchers";
    let params = [];

    if (isPartner) {
        sql += " WHERE partner_id = ?";
        params.push(req.session.userId);
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

// API: Add a voucher (with images)
app.post('/api/vouchers', isPartner, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), (req, res) => {
    const { venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry } = req.body;
    const partner_id = req.session.role === 'partner' ? req.session.userId : null;

    const image_url = req.files['image'] ? '/uploads/' + req.files['image'][0].filename : null;
    const logo_url = req.files['logo'] ? '/uploads/' + req.files['logo'][0].filename : null;

    const sql = `INSERT INTO vouchers (partner_id, venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry, image_url, logo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [partner_id, venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry, image_url, logo_url];

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

// API: Delete a voucher (also clean up booking_vouchers)
app.delete('/api/vouchers/:id', isPartner, (req, res) => {
    const voucherId = req.params.id;
    // First delete from booking_vouchers
    db.run('DELETE FROM booking_vouchers WHERE voucher_id = ?', [voucherId], (err) => {
        if (err) return res.status(400).json({ error: err.message });
        // Then delete from redemptions
        db.run('DELETE FROM redemptions WHERE voucher_id = ?', [voucherId], (err) => {
            if (err) return res.status(400).json({ error: err.message });
            // Finally delete the voucher
            db.run('DELETE FROM vouchers WHERE id = ?', [voucherId], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: 'deleted', changes: this.changes });
            });
        });
    });
});

// API: Update a voucher
app.put('/api/vouchers/:id', isPartner, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'logo', maxCount: 1 }]), (req, res) => {
    const { venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry } = req.body;
    const voucherId = req.params.id;

    // Build dynamic update
    let updates = [];
    let params = [];

    if (venue) { updates.push('venue = ?'); params.push(venue); }
    if (category) { updates.push('category = ?'); params.push(category); }
    if (categoryLabel) { updates.push('categoryLabel = ?'); params.push(categoryLabel); }
    if (discount) { updates.push('discount = ?'); params.push(discount); }
    if (shortDesc) { updates.push('shortDesc = ?'); params.push(shortDesc); }
    if (fullDesc) { updates.push('fullDesc = ?'); params.push(fullDesc); }
    if (terms) { updates.push('terms = ?'); params.push(terms); }
    if (location) { updates.push('location = ?'); params.push(location); }
    if (destination) { updates.push('destination = ?'); params.push(destination); }
    if (expiry) { updates.push('expiry = ?'); params.push(expiry); }

    // Handle images
    if (req.files && req.files['image']) {
        updates.push('image_url = ?');
        params.push('/uploads/' + req.files['image'][0].filename);
    }
    if (req.files && req.files['logo']) {
        updates.push('logo_url = ?');
        params.push('/uploads/' + req.files['logo'][0].filename);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(voucherId);
    const sql = `UPDATE vouchers SET ${updates.join(', ')} WHERE id = ?`;

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.json({ message: 'updated', changes: this.changes });
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

// API: Delete Booking (cascade delete booking_vouchers and redemptions)
app.delete('/api/bookings/:id', isAdmin, (req, res) => {
    const bookingId = req.params.id;
    // First delete from redemptions
    db.run('DELETE FROM redemptions WHERE booking_id = ?', [bookingId], (err) => {
        if (err) return res.status(400).json({ error: err.message });
        // Then delete from booking_vouchers
        db.run('DELETE FROM booking_vouchers WHERE booking_id = ?', [bookingId], (err) => {
            if (err) return res.status(400).json({ error: err.message });
            // Finally delete the booking
            db.run('DELETE FROM bookings WHERE id = ?', [bookingId], function (err) {
                if (err) return res.status(400).json({ error: err.message });
                res.json({ message: 'deleted', changes: this.changes });
            });
        });
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

// API: Redeem Voucher (Option B: Staff PIN or Master PIN)
const MASTER_PIN = '0000';

app.post('/api/redeem', (req, res) => {
    const { voucher_id, booking_code, pin } = req.body;

    // 1. Get Booking ID
    db.get('SELECT id FROM bookings WHERE code = ?', [booking_code], (err, booking) => {
        if (err || !booking) return res.status(400).json({ error: 'Invalid booking code' });

        // 2. Get Voucher and Partner PIN
        db.get(`
            SELECT v.id, u.pin_code 
            FROM vouchers v 
            LEFT JOIN users u ON v.partner_id = u.id 
            WHERE v.id = ?`,
            [voucher_id], (err, voucher) => {

                if (err || !voucher) return res.status(400).json({ error: 'Voucher not found or invalid' });

                // 3. Verify PIN (Master PIN 0000 OR Partner PIN)
                if (pin !== MASTER_PIN && voucher.pin_code !== pin) {
                    return res.status(401).json({ error: 'Invalid Staff PIN' });
                }

                // 4. Check if already redeemed for this booking
                db.get('SELECT id FROM redemptions WHERE booking_id = ? AND voucher_id = ?',
                    [booking.id, voucher_id], (err, existing) => {
                        if (err) return res.status(500).json({ error: err.message });

                        if (existing) {
                            return res.status(400).json({ error: 'Voucher already redeemed for this booking' });
                        }

                        // 5. Record Redemption
                        db.run('INSERT INTO redemptions (booking_id, voucher_id) VALUES (?, ?)',
                            [booking.id, voucher_id], (err) => {
                                if (err) return res.status(500).json({ error: err.message });
                                res.json({ success: true, message: 'Redemption successful!' });
                            });
                    });
            });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
