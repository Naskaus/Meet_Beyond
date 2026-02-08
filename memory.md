# Project Report & Handover: GoBeyond Voucher Wallet (v0.2)

**Date:** 2026-02-08 22:00  
**Version:** v0.2  
**Repository:** https://github.com/Naskaus/Meet_Beyond

## 1. Executive Summary
v0.2 focuses on critical security fixes and UI improvements. The most important fix prevents vouchers from being redeemed multiple times per booking. We also added image upload support, voucher edit functionality, and professional card styling for the traveler app.

## 2. Key Achievements (v0.2)

### 🔒 Security Fix: Multiple Redemption Prevention
- **Server-side check**: `/api/redeem` now queries `redemptions` table before inserting
- **Master PIN**: Added `0000` as universal PIN alongside partner-specific PINs
- **Frontend refresh**: Voucher list refreshes after redemption to show "USED" badge

### 📷 Image Upload Support
- **Multer integration**: Configured for voucher image/logo uploads
- **Static serving**: `/uploads` route serves uploaded images
- **Admin UI**: FormData-based upload with image preview in voucher list

### ✏️ Voucher CRUD Operations
- **Edit modal**: Full-featured edit form in admin panel
- **PUT endpoint**: `/api/vouchers/:id` with dynamic field updates
- **Cascade delete**: Vouchers, bookings now properly delete related records

### 🎨 Professional Traveler UI
- **Card redesign**: Images as backgrounds with gradient overlay
- **Smaller logos**: 48px logos positioned in top-left corner
- **Premium styling**: White text with shadows, accent-colored discount badges

### 🔄 Traveler Auto-Logout
- **Session clearing**: `localStorage.removeItem('bookingCode')` on app load
- **Security**: Travelers must ALWAYS enter booking code to access vouchers

## 3. Technical Stack

- **Server**: Node.js, Express.js
- **Database**: SQLite3
- **Auth**: `bcryptjs` (Password Hashing), `cookie-session`
- **Uploads**: `multer` (Image handling)
- **Frontend**: Vanilla JS, HTML5, CSS3, `anime.js`, Milligram

## 4. Database Schema

### `users`
- `id`, `username`, `password_hash`, `role`, `pin_code`

### `vouchers`
- `id`, `partner_id`, `venue`, `category`, `discount`, `terms`
- `image_url`, `logo_url` (NEW: image paths)

### `bookings`
- `id`, `code`

### `booking_vouchers`
- `id`, `booking_id`, `voucher_id`

### `redemptions`
- `id`, `booking_id`, `voucher_id`, `redeemed_at`
- `UNIQUE(booking_id, voucher_id)` constraint

## 5. API Endpoints

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/login` | Public | Auth for Admin/Partner |
| `POST` | `/api/logout` | Auth | Destroy session |
| `GET` | `/api/users` | Admin | List Partners |
| `POST` | `/api/users` | Admin | Create Partner |
| `GET` | `/api/vouchers` | Public | List Vouchers |
| `POST` | `/api/vouchers` | Partner | Create Voucher (with images) |
| `PUT` | `/api/vouchers/:id` | Partner | Update Voucher (NEW) |
| `DELETE` | `/api/vouchers/:id` | Partner | Delete Voucher (cascade) |
| `GET` | `/api/bookings` | Admin | List Booking Codes |
| `DELETE` | `/api/bookings/:id` | Admin | Delete Booking (cascade) |
| `POST` | `/api/validate` | Public | Validate Booking Code |
| `POST` | `/api/redeem` | Public | Validate PIN & Record Redemption |

## 6. How to Run

```bash
npm install
node server.js
```

**Access:**
- **Landing**: `http://localhost:3000`
- **App**: `http://localhost:3000/app` (Code: `BKK-2026-ABCD`)
- **Admin**: `http://localhost:3000/admin` (User: `admin`, Pass: `admin123`)

## 7. Known Issues / Next Steps

### To Fix
- Delete voucher/booking: Investigate if working correctly in production

### Future Enhancements
- **Analytics Dashboard**: Visualize redemption data
- **Partner Dashboard**: Partner-specific redemption stats
- **Rate limiting**: PIN attempt throttling
- **Audit logging**: Track all redemptions with user info