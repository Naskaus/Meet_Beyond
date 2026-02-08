const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./voucher_wallet.db');

db.serialize(() => {
    console.log("Patching database...");

    // 1. Set Admin PIN
    db.run(`UPDATE users SET pin_code = '0000' WHERE username = 'admin'`, function (err) {
        if (err) console.error("Error updating admin PIN:", err);
        else console.log(`Updated Admin PIN. Rows affected: ${this.changes}`);
    });

    // 2. Assign Orphaned Vouchers to Admin
    db.get(`SELECT id FROM users WHERE username = 'admin'`, (err, admin) => {
        if (err || !admin) {
            console.error("Admin user not found!");
            return;
        }

        db.run(`UPDATE vouchers SET partner_id = ? WHERE partner_id IS NULL`, [admin.id], function (err) {
            if (err) console.error("Error linking vouchers:", err);
            else console.log(`Linked orphaned vouchers to Admin (ID ${admin.id}). Rows affected: ${this.changes}`);
        });
    });

    // 3. Verify
    db.all(`SELECT id, venue, partner_id FROM vouchers`, (err, rows) => {
        if (err) console.error(err);
        else console.log("Current Vouchers:", rows);
    });
});
