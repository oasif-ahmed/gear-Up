# GearUp 🏋️

Backend API for a sports & outdoor gear rental service. Customers rent gear, providers manage inventory and fulfill orders, admins moderate the platform.

**Stack:** Node.js + Express 5, TypeScript, PostgreSQL + Prisma 7, JWT auth, Stripe payments, bcrypt.

## Setup

```bash
npm install
cp .env.example .env   # fill DATABASE_URL, JWT secrets, Stripe keys
npx prisma migrate dev
npm run dev            # http://localhost:3000
```

## Roles

| Role | Can do |
|------|--------|
| `CUSTOMER` | Browse gear, place orders, pay, track, cancel, review |
| `PROVIDER` | Manage gear inventory & stock, fulfill orders |
| `ADMIN` | Manage users, gear, rentals, categories |

Users pick their role at registration. Protected routes need the JWT from login: `Authorization: Bearer <jwtAccessToken>`.

**Base URL:** `{{baseUrl}}/api` — Postman collection: [`postman/GearUp.postman_collection.json`](postman/GearUp.postman_collection.json)

---

## Authentication

| Method | Endpoint | Access | Payload |
|--------|----------|:------:|---------|
| POST | `/api/auth/register` | 🔓 | see below |
| POST | `/api/auth/login` | 🔓 | see below |
| GET | `/api/auth/me` | 👤 any | — |
| PATCH | `/api/auth/me` | 👤 any | see below |

**POST `/api/auth/register`**
```json
{
  "name": "Rakib Hasan",
  "email": "rakib@example.com",
  "password": "pass1234",
  "role": "CUSTOMER",
  "profilePhoto": "https://example.com/avatar.jpg",
  "phone": "01712345678",
  "bio": "Weekend cyclist"
}
```
> `name`, `email`, `password`, `role` required. `role` = `CUSTOMER` \| `PROVIDER` \| `ADMIN`. `profilePhoto`, `phone`, `bio` optional.

**POST `/api/auth/login`**
```json
{ "email": "rakib@example.com", "password": "pass1234" }
```
> Returns `jwtAccessToken` — use it as the Bearer token.

**PATCH `/api/auth/me`** (send only what you change)
```json
{ "name": "Rakib H.", "email": "new@example.com", "profilePhoto": "url", "phone": "01799999999", "bio": "Trekking now" }
```

---

## Gear (Public)

| Method | Endpoint | Access | Notes |
|--------|----------|:------:|-------|
| GET | `/api/gear` | 🔓 | query: `categoryId`, `brand`, `minPrice`, `maxPrice`, `search`, `availability` |
| GET | `/api/gear/:id` | 🔓 | gear details |
| GET | `/api/categories` | 🔓 | all categories |

> `availability` = `in_stock` \| `out_stock`. `search` matches name or brand.

---

## Rental Orders

| Method | Endpoint | Access | Payload |
|--------|----------|:------:|---------|
| POST | `/api/rentals` | 🛒 CUSTOMER | see below |
| GET | `/api/rentals` | 🛒 CUSTOMER | — |
| GET | `/api/rentals/:id` | 🛒 CUSTOMER | — |
| PATCH | `/api/rentals/:id/cancel` | 🛒 CUSTOMER | — (only PLACED/CONFIRMED) |

**POST `/api/rentals`**
```json
{
  "startDate": "2026-11-01",
  "endDate": "2026-11-04",
  "items": [
    { "gearItemId": "39bcc172-17e9-4902-9460-75122f8b2abf", "quantity": 1 }
  ]
}
```
> `totalAmount` is calculated by the server. Stock is reduced automatically. New orders start as `PLACED`.

---

## Payments (Stripe)

| Method | Endpoint | Access | Payload |
|--------|----------|:------:|---------|
| POST | `/api/payments/create` | 🛒 CUSTOMER | see below |
| POST | `/api/payments/webhook` | 🔓 Stripe | Stripe event (raw body) |
| GET | `/api/payments` | 🛒 CUSTOMER | — |
| GET | `/api/payments/:id` | 🛒 CUSTOMER | — |

**POST `/api/payments/create`**
```json
{ "rentalOrderId": "uuid" }
```
> Order must be `CONFIRMED`. Returns `checkoutUrl` to pay on Stripe. The webhook marks the order `PAID`.

---

## Reviews

| Method | Endpoint | Access | Payload |
|--------|----------|:------:|---------|
| POST | `/api/reviews` | 🛒 CUSTOMER | see below |
| GET | `/api/reviews/gear/:gearItemId` | 🔓 | — |
| GET | `/api/reviews/my-reviews` | 🛒 CUSTOMER | — |
| PATCH | `/api/reviews/:id` | 🛒 CUSTOMER | see below |
| DELETE | `/api/reviews/:id` | 🛒 CUSTOMER | — |

**POST `/api/reviews`**
```json
{ "gearItemId": "uuid", "rating": 5, "comment": "Great gear!" }
```
> Only after the rental with that gear is `RETURNED`. `rating` = integer 1–5.

**PATCH `/api/reviews/:id`**
```json
{ "rating": 4, "comment": "Updated comment" }
```

---

## Provider

| Method | Endpoint | Access | Payload |
|--------|----------|:------:|---------|
| POST | `/api/provider/gear` | 🏪 PROVIDER | see below |
| PUT | `/api/provider/gear/:id` | 🏪 PROVIDER | same fields, all optional |
| DELETE | `/api/provider/gear/:id` | 🏪 PROVIDER | — |
| PATCH | `/api/provider/gear/:id/stock` | 🏪 PROVIDER | see below |
| GET | `/api/provider/orders` | 🏪 PROVIDER | — |
| PATCH | `/api/provider/orders/:id` | 🏪 PROVIDER | see below |

**POST `/api/provider/gear`**
```json
{
  "name": "Quechua 2P Tent",
  "description": "Waterproof 2-person camping tent",
  "brand": "Quechua",
  "categoryId": "uuid",
  "condition": "GOOD",
  "pricePerDay": 500,
  "securityDeposit": 2000,
  "quantity": 3,
  "status": "AVAILABLE",
  "images": ["https://example.com/tent.jpg"],
  "specifications": { "weight": "2.4kg", "capacity": 2 }
}
```
> `name`, `description`, `categoryId`, `pricePerDay` required. `condition` = `NEW` \| `LIKE_NEW` \| `GOOD` \| `FAIR`. `status` = `AVAILABLE` \| `NOT_AVAILABLE`.

**PATCH `/api/provider/gear/:id/stock`** (adds to current stock)
```json
{ "quantity": 5 }
```

**PATCH `/api/provider/orders/:id`**
```json
{ "status": "CONFIRMED" }
```
> Allowed flow: `PLACED → CONFIRMED → PAID → PICKED_UP → RETURNED`. `CANCELLED` can happen before pickup. Stock auto-restores on `CANCELLED`/`RETURNED`.

---

## Admin

| Method | Endpoint | Access | Payload |
|--------|----------|:------:|---------|
| GET | `/api/admin/users` | 🛡️ ADMIN | — |
| PATCH | `/api/admin/users/:id` | 🛡️ ADMIN | see below |
| GET | `/api/admin/gear` | 🛡️ ADMIN | — |
| GET | `/api/admin/rentals` | 🛡️ ADMIN | — |
| POST | `/api/admin/categories` | 🛡️ ADMIN | see below |
| GET | `/api/admin/categories` | 🔓 | — |

**PATCH `/api/admin/users/:id`**
```json
{ "activeStatus": "SUSPEND" }
```
> `activeStatus` = `ACTIVE` \| `SUSPEND`.

**POST `/api/admin/categories`**
```json
{ "name": "Camping", "description": "Tents and camp gear", "image": "https://example.com/camping.jpg" }
```
> `name` required and unique.

---

## Response Format

```json
{ "success": true, "statusCode": 200, "message": "...", "data": { } }
```
```json
{ "success": false, "statusCode": 400, "message": "..." }
```
