# Project Report & Handover: GoBeyond Voucher Wallet (v0.1)

**Date:** 2026-02-07 23:45
**Version:** v0.1
**Repository:** https://github.com/Naskaus/Meet_Beyond

## 1. Executive Summary
In this session, we successfully transformed a static HTML prototype into a fully dynamic, database-driven web application ("GoBeyond Voucher Wallet"). We rebranded the entire interface to match the "GoBeyond" identity (Red & White theme) and implemented a robust 3-role authentication system with a secure PIN-based redemption flow.

## 2. Key Achievements

### 🏗️ Architecture Migration
- **Backend**: Migrated to **Node.js** with **Express.js**.
- **Database**: Implemented **SQLite** (`voucher_wallet.db`) for zero-config persistence.
- **Frontend**: Served statically by Express, with API calls for data fetching.

### 🎨 Rebranding (GoBeyond)
- **Theme**: Switched from Dark Mode to a clean **Red & White** Light Mode.
- **Logo**: Integrated `logo.jpeg` across Landing Page, App, and Admin Dashboard.
- **UI**: Updated `styles.css` and `app/styles.css` with new design tokens.

### 🔐 Authentication & Roles
Implemented a secure session-based auth system with 3 distinct roles:
1.  **Admin** (`role: 'admin'`): Full access. Can create Partners and Bookings.
2.  **Partner** (`role: 'partner'`): Limited access. Can only create/manage *their own* vouchers.
3.  **Traveler**: No account required. Authenticates via **Booking Code** (`BKK-2026-ABCD`).

### 🎫 Redemption System (Option B)
- **Flow**: Traveler clicks "Redeem" -> Modal requests PIN -> Staff enters PIN -> Server validates -> Redemption recorded.
- **Security**: PINs are 4-digit codes assigned to Partners by Admins.

## 3. Technical Stack

- **Server**: Node.js, Express.js
- **Database**: SQLite3
- **Auth**: `bcryptjs` (Password Hashing), `cookie-session` (Session Management)
- **Frontend**: Vanilla JS, HTML5, CSS3, `anime.js` (Animations), Milligram (Admin UI)

## 4. Database Schema

### `users`
- `id`: INTEGER PK
- `username`: TEXT UNIQUE
- `password_hash`: TEXT (Bcrypt)
- `role`: TEXT ('admin', 'partner')
- `pin_code`: TEXT (4-digit, for Partners)

### `vouchers`
- `id`: INTEGER PK
- `partner_id`: INTEGER FK (Ref `users`)
- `venue`, `category`, `discount`, `terms`, etc.

### `bookings`
- `id`: INTEGER PK
- `code`: TEXT UNIQUE (e.g., 'BKK-2026-ABCD')

### `redemptions`
- `id`: INTEGER PK
- `booking_id`: INTEGER FK
- `voucher_id`: INTEGER FK
- `redeemed_at`: TIMESTAMP

## 5. API Endpoints

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Auth for Admin/Partner |
| `POST` | `/api/logout` | Auth | Destroy session |
| `GET` | `/api/users` | Admin | List Partners |
| `POST` | `/api/users` | Admin | Create Partner |
| `GET` | `/api/vouchers` | Public/Partner | List Vouchers (Filtered for Partners) |
| `POST` | `/api/vouchers` | Partner | Create Voucher |
| `DELETE` | `/api/vouchers/:id` | Partner | Delete Vouchers |
| `GET` | `/api/bookings` | Admin | List Booking Codes |
| `POST` | `/api/validate` | Public | Validate Booking Code |
| `POST` | `/api/redeem` | Public | Validate PIN & Record Redemption |

## 6. How to Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Start Server**:
    ```bash
    node server.js
    ```
3.  **Access**:
    - **Landing**: `http://localhost:3000`
    - **App**: `http://localhost:3000/app` (Code: `BKK-2026-ABCD`)
    - **Admin**: `http://localhost:3000/admin` (User: `admin`, Pass: `admin123`)

## 7. Next Steps for v0.2
- **Analytics Dashboard**: Visualize redemption data in the Admin panel.
- **Partner Dashboard**: Allow partners to see their own redemption stats.
- **Password Reset**: Implement email-based reset.
- **PWA Enhancements**: Offline support and Manifest refinement.