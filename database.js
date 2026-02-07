const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const db = new sqlite3.Database('./voucher_wallet.db');

db.serialize(() => {
  // Create Users Table (Admin & Partners)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT, -- 'admin' or 'partner'
    pin_code TEXT, -- 4-digit PIN for redemption (partners only)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create Redemptions Table
  db.run(`CREATE TABLE IF NOT EXISTS redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    voucher_id INTEGER,
    redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id),
    FOREIGN KEY(voucher_id) REFERENCES vouchers(id)
  )`);

  // Add partner_id to vouchers if not exists (migrating existing table)
  // SQLite doesn't support IF NOT EXISTS for columns, so we try/catch or just ignore error
  db.run(`ALTER TABLE vouchers ADD COLUMN partner_id INTEGER`, (err) => {
    // Ignore error if column already exists
  });

  // Create Vouchers Table (if not exists)
  db.run(`CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER,
    venue TEXT,
    category TEXT,
    categoryLabel TEXT,
    discount TEXT,
    shortDesc TEXT,
    fullDesc TEXT,
    terms TEXT,
    location TEXT,
    destination TEXT,
    expiry TEXT,
    FOREIGN KEY(partner_id) REFERENCES users(id)
  )`);

  // Seed Default Admin
  const adminPassword = 'admin123'; // Default password
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(adminPassword, salt);

  db.run(`INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)`,
    ['admin', hash, 'admin']
  );

  // Create Bookings Table (for validation)
  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    status TEXT DEFAULT 'active'
  )`);

  // Create Booking-Voucher Visibility Table (v0.11)
  db.run(`CREATE TABLE IF NOT EXISTS booking_vouchers (
    booking_id INTEGER,
    voucher_id INTEGER,
    PRIMARY KEY (booking_id, voucher_id),
    FOREIGN KEY(booking_id) REFERENCES bookings(id),
    FOREIGN KEY(voucher_id) REFERENCES vouchers(id)
  )`);

  // Migration: If booking_vouchers is empty but bookings exist, link ALL vouchers to existing bookings
  db.get("SELECT count(*) as count FROM booking_vouchers", (err, row) => {
    if (!err && row.count === 0) {
      db.all("SELECT id FROM bookings", (err, bookings) => {
        if (!err && bookings.length > 0) {
          console.log("Migrating existing bookings to have ALL vouchers...");
          db.all("SELECT id FROM vouchers", (err, vouchers) => {
            if (!err) {
              const stmt = db.prepare("INSERT OR IGNORE INTO booking_vouchers (booking_id, voucher_id) VALUES (?, ?)");
              bookings.forEach(b => {
                vouchers.forEach(v => {
                  stmt.run(b.id, v.id);
                });
              });
              stmt.finalize();
            }
          });
        }
      });
    }
  });

  // Seed Data
  const stmt = db.prepare(`INSERT INTO vouchers (venue, category, categoryLabel, discount, shortDesc, fullDesc, terms, location, destination, expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const vouchers = [
    // Bangkok — Khao San area
    {
      venue: 'Sky High Rooftop Bar',
      category: 'nightlife',
      categoryLabel: 'Nightlife',
      discount: '15% off drinks',
      shortDesc: 'Craft cocktails with panoramic views of the Grand Palace skyline.',
      fullDesc: 'Perched 32 floors above Khao San Road, Sky High serves award-winning cocktails alongside Thai-inspired bar bites. Show your voucher before ordering to receive 15% off your entire drinks tab.',
      terms: 'Valid for drinks only. Not combinable with other promotions. Maximum 4 drinks per voucher. Must show voucher before ordering.',
      location: 'Khao San Road, Bangkok',
      destination: 'Bangkok',
      expiry: 'Mar 31, 2026'
    },
    {
      venue: 'Bangkok Bites Street Food Tour',
      category: 'food',
      categoryLabel: 'Food & Drink',
      discount: '100 THB off',
      shortDesc: 'Guided 3-hour evening food tour through Bangkok\'s best hidden stalls.',
      fullDesc: 'Join a local guide for a 3-hour evening walking tour through Bangkok\'s legendary street food scene. Taste 8+ dishes from hidden stalls and family-run shops that most tourists never find. Tours depart nightly at 6 PM from Khao San Road.',
      terms: 'Book at least 24 hours in advance. 100 THB discount per person, maximum 2 people per voucher. Not valid on public holidays.',
      location: 'Khao San Road, Bangkok',
      destination: 'Bangkok',
      expiry: 'Mar 31, 2026'
    },
    {
      venue: 'Siam Serenity Massage',
      category: 'wellness',
      categoryLabel: 'Wellness',
      discount: '20% off',
      shortDesc: 'Traditional Thai massage in a tranquil oasis near the backpacker strip.',
      fullDesc: 'Escape the Khao San chaos at Siam Serenity, a boutique massage studio offering traditional Thai, oil, and herbal compress treatments. All therapists are certified with 5+ years of experience. The 20% discount applies to any treatment.',
      terms: 'Walk-ins welcome, reservation recommended. Valid for one treatment per voucher. Not valid with other discounts or promotions.',
      location: 'Rambuttri Alley, Bangkok',
      destination: 'Bangkok',
      expiry: 'Mar 31, 2026'
    },

    // Chiang Mai — Old City
    {
      venue: 'Spice & Soul Cooking Class',
      category: 'activities',
      categoryLabel: 'Activities',
      discount: '150 THB off',
      shortDesc: 'Learn to cook 5 authentic Thai dishes with a local chef.',
      fullDesc: 'Spend a morning at the market selecting fresh ingredients, then head to a traditional Thai kitchen to learn 5 classic dishes — from green curry to mango sticky rice. You\'ll eat everything you make. Classes run daily at 9 AM and 2 PM.',
      terms: '150 THB off per person. Advance booking required. Cancellation must be made 12+ hours before class start time.',
      location: 'Old City, Chiang Mai',
      destination: 'Chiang Mai',
      expiry: 'Apr 15, 2026'
    },
    {
      venue: 'Nimman Brew Coffee',
      category: 'food',
      categoryLabel: 'Food & Drink',
      discount: 'Free drink with meal',
      shortDesc: 'Specialty single-origin Thai coffee — free drink when you order food.',
      fullDesc: 'Nimman Brew roasts single-origin beans from the hills of northern Thailand. Order any food item and get a complimentary hot or iced coffee of your choice. Their avocado toast and khao soi are local favorites.',
      terms: 'One free drink per food order. Valid for standard menu drinks only (no specials). Dine-in only.',
      location: 'Nimmanhaemin, Chiang Mai',
      destination: 'Chiang Mai',
      expiry: 'Apr 15, 2026'
    },
    {
      venue: 'Night Bazaar Food Court',
      category: 'food',
      categoryLabel: 'Food & Drink',
      discount: '10% off',
      shortDesc: 'Massive food court with 50+ stalls — 10% off your total bill.',
      fullDesc: 'The Night Bazaar Food Court brings together the best of Chiang Mai street food under one roof. From Northern Thai sausage to pad see ew to freshly grilled seafood, there\'s something for everyone. Show your voucher at the cashier for 10% off.',
      terms: 'Valid at the central cashier only. Not valid at independent vendor stalls outside the food court. Minimum spend 200 THB.',
      location: 'Night Bazaar, Chiang Mai',
      destination: 'Chiang Mai',
      expiry: 'Apr 15, 2026'
    },
    {
      venue: 'Sacred Steps Temple Tour',
      category: 'activities',
      categoryLabel: 'Activities',
      discount: '20% off',
      shortDesc: 'Half-day guided tour of Chiang Mai\'s most stunning ancient temples.',
      fullDesc: 'Visit 4 of Chiang Mai\'s most significant temples with an English-speaking guide who brings centuries of history to life. Includes Wat Chedi Luang, Wat Phra Singh, and the hidden Wat Umong forest temple. Morning and afternoon departures available.',
      terms: '20% off per person. Book 24 hours in advance. Modest clothing required (shoulders and knees covered). Transport included.',
      location: 'Old City, Chiang Mai',
      destination: 'Chiang Mai',
      expiry: 'Apr 15, 2026'
    },

    // Islands — Koh Phangan / Koh Tao
    {
      venue: 'Blue Horizon Dive Shop',
      category: 'activities',
      categoryLabel: 'Activities',
      discount: '500 THB off Open Water',
      shortDesc: 'Get certified to dive in crystal-clear Gulf of Thailand waters.',
      fullDesc: 'Blue Horizon is a PADI 5-star dive center with 15 years on Koh Tao. Their Open Water Diver course runs over 3 days with small groups (max 4 students per instructor). Save 500 THB on the course fee and explore some of the world\'s best beginner dive sites.',
      terms: 'Valid for PADI Open Water course only. Must book directly with the shop. Not combinable with other discounts. Subject to availability.',
      location: 'Sairee Beach, Koh Tao',
      destination: 'Islands',
      expiry: 'May 1, 2026'
    },
    {
      venue: 'Sunset Shack Beach Bar',
      category: 'nightlife',
      categoryLabel: 'Nightlife',
      discount: '2-for-1 cocktails',
      shortDesc: 'Beachfront cocktails with your feet in the sand — buy one, get one free.',
      fullDesc: 'The Sunset Shack sits right on Haad Rin beach with unobstructed sunset views. Their signature cocktails use fresh Thai fruits and local spirits. Present your voucher for 2-for-1 on any cocktail, all day every day.',
      terms: 'One voucher use per visit. Valid on standard cocktails only (not premium spirits). Must show voucher before ordering.',
      location: 'Haad Rin, Koh Phangan',
      destination: 'Islands',
      expiry: 'May 1, 2026'
    },
    {
      venue: 'Island Kayak Adventures',
      category: 'activities',
      categoryLabel: 'Activities',
      discount: '30% off',
      shortDesc: 'Explore hidden coves and mangroves by kayak — solo or tandem.',
      fullDesc: 'Paddle through mangrove forests, discover hidden beaches, and snorkel in secluded bays. Choose from half-day or full-day guided tours, or rent a kayak for independent exploration. All equipment and safety briefing included.',
      terms: '30% off any rental or guided tour. Advance booking recommended for guided tours. Weather dependent — full refund if cancelled due to conditions.',
      location: 'Chalok Bay, Koh Tao',
      destination: 'Islands',
      expiry: 'May 1, 2026'
    },
    {
      venue: 'Golden Hour Boat Trip',
      category: 'activities',
      categoryLabel: 'Activities',
      discount: '200 THB off',
      shortDesc: 'Sunset longtail boat cruise with snorkeling and Thai dinner on board.',
      fullDesc: 'Cruise the Gulf of Thailand as the sun sets on a traditional longtail boat. The 3-hour trip includes snorkeling at Koh Nang Yuan, a fresh seafood dinner, and drinks. Small groups of 8-12 people ensure a personal experience.',
      terms: '200 THB off per person. Book at least 48 hours in advance. Departure subject to weather. Full refund if cancelled by operator.',
      location: 'Mae Haad Pier, Koh Tao',
      destination: 'Islands',
      expiry: 'May 1, 2026'
    },
    {
      venue: 'Tiger Muay Thai Camp',
      category: 'wellness',
      categoryLabel: 'Wellness',
      discount: 'First session free',
      shortDesc: 'Train with pro fighters — your first Muay Thai session is on the house.',
      fullDesc: 'Tiger Muay Thai offers authentic training with experienced Thai fighters. Your free first session includes warm-up, technique drills, pad work, and a cool-down stretch. All fitness levels welcome — from first-timers to experienced fighters.',
      terms: 'One free session per person. Must register in advance. Bring your own shorts and hand wraps (available for purchase). Sessions daily at 7 AM and 4 PM.',
      location: 'Thong Sala, Koh Phangan',
      destination: 'Islands',
      expiry: 'May 1, 2026'
    }
  ];

  // Check if table is empty before seeding
  db.get("SELECT count(*) as count FROM vouchers", (err, row) => {
    if (err) {
      return console.error(err.message);
    }
    if (row.count === 0) {
      console.log("Seeding vouchers...");
      vouchers.forEach(v => {
        stmt.run(v.venue, v.category, v.categoryLabel, v.discount, v.shortDesc, v.fullDesc, v.terms, v.location, v.destination, v.expiry);
      });
      stmt.finalize();
    } else {
      console.log("Vouchers table already seeded.");
    }
  });

  // Seed Booking Code
  const bookingStmt = db.prepare(`INSERT OR IGNORE INTO bookings (code) VALUES (?)`);
  bookingStmt.run('BKK-2026-ABCD');
  bookingStmt.finalize();

});

module.exports = db;
