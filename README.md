# GearUp 🏋️

**"Rent Sports & Outdoor Gear Instantly"**

Complete REST API for a sports & outdoor equipment rental service.

- **Customers** browse gear, place rental orders, pay with Stripe, track status, cancel before payment, and leave reviews.
- **Providers** manage gear inventory, stock, and fulfill incoming orders.
- **Admins** manage users (suspend/activate), oversee all gear & rentals, and manage categories.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Environment Variables](#environment-variables)
4. [How Authentication Works](#how-authentication-works)
5. [Response & Error Format](#response--error-format)
6. [Enum Reference](#enum-reference)
7. [Database Schema](#database-schema)
8. [API Routes — Full Documentation](#api-routes--full-documentation)
   - [8.1 Authentication & Profile](#81-authentication--profile)
   - [8.2 Public Gear & Categories](#82-public-gear--categories)
   - [8.3 Rental Orders](#83-rental-orders)
   - [8.4 Payments (Stripe)](#84-payments-stripe)
   - [8.5 Reviews](#85-reviews)
   - [8.6 Provider Management](#86-provider-management)
   - [8.7 Admin](#87-admin)
9. [Complete Workflows (Step-by-Step)](#complete-workflows-step-by-step)
10. [Using the Postman Collection](#using-the-postman-collection)

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js + Express 5 | HTTP server & routing |
| TypeScript (ESM) | Type safety |
| PostgreSQL + Prisma 7 | Database & ORM |
| JWT (httpOnly cookie + Bearer token) | Authentication |
| Stripe Checkout | Payment gateway |
| bcrypt | Password hashing |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env → DATABASE_URL, JWT secrets, Stripe keys

# 3. Apply database migrations
npx prisma migrate dev

# 4. Start the dev server
npm run dev
```

Server runs at **`http://localhost:3000`** — all API routes are prefixed with `/api`.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run stripe:listen` | Forward Stripe webhooks to `localhost:3000/api/payments/webhook` |
| `npx prisma studio` | Browse/edit the database visually |

---

## Environment Variables

Copy [`.env.example`](.env.example) → `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | ✅ | Server port (e.g. `3000`) |
| `APP_URL` | ✅ | Base URL of the API (e.g. `http://localhost:3000`) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `BCRYPT_SALT_ROUNDS` | ✅ | Password hashing rounds (e.g. `10`) |
| `JWT_ACCESS_SECRET` | ✅ | Access token secret (expires in `JWT_ACCESS_EXPIRES_IN`) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | Access token lifetime (e.g. `1h`) |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | Refresh token lifetime (e.g. `7d`) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (`sk_test_...`) |
| `STRIPE_PRODUCT_PRICE_ID` | ✅ | Stripe price ID used for checkout line items |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret (`whsec_...`) |

---

## How Authentication Works

Every protected route requires a **JWT access token** obtained from `POST /api/auth/login`.

**Two ways to send it in Postman:**

| Method | How | Recommended |
|--------|-----|-------------|
| **Bearer header** | `Authorization: Bearer <jwtAccessToken>` | ✅ Use this |
| **Cookie** | `accessToken=<jwt>` cookie (set automatically on login) | Browser clients |

The token payload is `{ id, name, email, role }` and stays valid for `JWT_ACCESS_EXPIRES_IN`.

> **Roles:** `CUSTOMER`, `PROVIDER`, `ADMIN` — chosen by the user at registration.
> A suspended user (`activeStatus = SUSPEND`) receives **403** on login and on every protected route.

**Admin credentials:** register via `POST /api/auth/register` with `"role": "ADMIN"` (or use your deployed admin account).

---

## Response & Error Format

**Every** response follows the same structure:

### Success
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Gear Items Retrieved Successfully!",
  "data": { "gearItems": [] }
}
```

### Error
```json
{
  "success": false,
  "statusCode": 400,
  "message": "rating must be an integer between 1 and 5!",
  "error": { }
}
```
> `error` is only included when `NODE_ENV=development`.

### Unknown route (404 handler)
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Route GET /api/nope not found!"
}
```

### Status code map

| Code | Meaning | Example |
|------|---------|---------|
| `200` | OK — read/update success | GET, PATCH, DELETE |
| `201` | Created | POST register/create |
| `400` | Validation / bad request | `rating must be an integer between 1 and 5!` |
| `401` | Not logged in / bad token | `you are not logged in...` |
| `403` | Role or ownership denied | `You can review this gear only after the rental is RETURNED!` |
| `404` | Resource not found | `Gear Item not found!` |
| `409` | Duplicate / conflict | `You have already reviewed this gear for this rental!` |
| `500` | Unexpected server error | `Something went wrong!` |

Prisma errors are mapped automatically: `P2002 → 409`, `P2025 → 404`, `P2003 → 400`.

---

## Enum Reference

These exact string values are used in payloads (they come from your Prisma enums):

| Enum | Values | Used by |
|------|--------|---------|
| `Role` | `CUSTOMER`, `PROVIDER`, `ADMIN` | register payload |
| `ActiveStatus` | `ACTIVE`, `SUSPEND` | admin user status payload |
| `GearCondition` | `NEW`, `LIKE_NEW`, `GOOD`, `FAIR` | gear create/update |
| `GearStatus` | `AVAILABLE`, `NOT_AVAILABLE` | gear create/update, availability filter |
| `RentalStatus` | `PLACED`, `CONFIRMED`, `PAID`, `PICKED_UP`, `RETURNED`, `CANCELLED` | order status payload |
| `PaymentStatus` | `PENDING`, `COMPLETED`, `FAILED` | returned by payment endpoints (read-only) |

---

## Database Schema

Multi-file Prisma schema in [`prisma/schema/`](prisma/schema/). Your payloads must match these models:

| Model (table) | Fields |
|---------------|--------|
| **User** (`users`) | `id` uuid, `name`, `email` **unique**, `password` (bcrypt, never returned), `activeStatus` = `ACTIVE\|SUSPEND`, `role` = `CUSTOMER\|PROVIDER\|ADMIN`, timestamps |
| **Profile** (`profiles`) | `id`, `profilePhoto?`, `phone?` **unique**, `bio?`, `userId` **unique** (1:1 User) |
| **Category** (`categories`) | `id`, `name` **unique**, `description?`, `image?` |
| **GearItem** (`gear_items`) | `id`, `name`, `description`, `brand?`, `images` `string[]`, `specifications` `Json?`, `condition`, `pricePerDay` Decimal(10,2), `securityDeposit?` Decimal(10,2), `quantity` int (stock), `status`, `categoryId` → Category, `providerId` → User; **unique per** `(providerId, name, brand, categoryId, condition)` |
| **RentalOrder** (`rental_orders`) | `id`, `customerId` → User, `startDate`, `endDate`, `totalAmount` Decimal(10,2), `status` = `RentalStatus`, timestamps |
| **RentalOrderItem** (`rental_order_items`) | `id`, `rentalOrderId`, `gearItemId`, `quantity`, `pricePerDay` (price snapshot); **unique per** `(rentalOrderId, gearItemId)` |
| **Payment** (`payments`) | `id`, `rentalOrderId` **unique**, `transactionId?` **unique** (Stripe), `checkoutSessionId?` **unique**, `amount` Decimal(10,2), `status` = `PENDING\|COMPLETED\|FAILED`, `paidAt?` |
| **Review** (`reviews`) | `id`, `rating` int 1–5, `comment?`, `customerId`, `gearItemId`, `rentalOrderId`; **unique per** `(customerId, rentalOrderId, gearItemId)` |

---

## API Routes — Full Documentation

> **Postman URL format:** every URL below is written as `{{baseUrl}}/api/...`.
> Set the `baseUrl` variable to `http://localhost:3000` (or your deployed URL).
> Set the `token` variable to `jwtAccessToken` from the login response — the login request in the collection does this automatically.
>
> One extra route exists outside `/api`: `GET {{baseUrl}}/` → `200 "App is working"` (health check, no auth).

**Legend:** 🔓 public · 👤 any logged-in role · 🛒 CUSTOMER · 🏪 PROVIDER · 🛡️ ADMIN

---

### 8.1 Authentication & Profile

Base path: `{{baseUrl}}/api/auth`

---

#### 📌 POST `/api/auth/register` — 🔓 public

Creates a new user together with an empty profile row. Password is bcrypt-hashed; the response never contains it.

**Postman URL:** `{{baseUrl}}/api/auth/register`
**Headers:** `Content-Type: application/json` (no auth)

**Request body:**
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

| Field | Type | Required | Validation / Maps to |
|-------|------|----------|----------------------|
| `name` | string | ✅ | `User.name` |
| `email` | string | ✅ | `User.email` — **unique**; duplicate → `409 user already Exists.` |
| `password` | string | ✅ | `User.password` — hashed with bcrypt (`BCRYPT_SALT_ROUNDS`) |
| `role` | enum string | ✅ | `User.role` — `CUSTOMER` \| `PROVIDER` \| `ADMIN`; missing → `400 Role field must be filled before register!` |
| `profilePhoto` | string | ❌ | `Profile.profilePhoto` |
| `phone` | string | ❌ | `Profile.phone` — unique across all users |
| `bio` | string | ❌ | `Profile.bio` |

**Success — `201 Created`:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "user Created Successfully!",
  "data": {
    "user": {
      "id": "uuid",
      "name": "Rakib Hasan",
      "email": "rakib@example.com",
      "role": "CUSTOMER",
      "activeStatus": "ACTIVE",
      "createdAt": "...",
      "updatedAt": "...",
      "profile": { "id": "uuid", "profilePhoto": "...", "phone": "01712345678", "bio": "Weekend cyclist" }
    }
  }
}
```

**Errors:** `409` email already exists · `400` role missing · `500` if `password`/`email` missing (fields are required by the model).

---

#### 📌 POST `/api/auth/login` — 🔓 public

Verifies credentials and issues a JWT. Also sets `accessToken` + `refreshToken` httpOnly cookies.

**Postman URL:** `{{baseUrl}}/api/auth/login`
**Headers:** `Content-Type: application/json`

**Request body:**
```json
{
  "email": "rakib@example.com",
  "password": "pass1234"
}
```

| Field | Type | Required | Maps to |
|-------|------|----------|---------|
| `email` | string | ✅ | `User.email` |
| `password` | string | ✅ | compared with bcrypt hash of `User.password` |

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User Logged in Successfully!",
  "data": {
    "user": { "id": "uuid", "name": "Rakib Hasan", "email": "rakib@example.com", "role": "CUSTOMER", "activeStatus": "ACTIVE" },
    "jwtAccessToken": "eyJhbGciOi...",
    "jwtRefreshToken": "eyJhbGciOi..."
  }
}
```
> 💡 Copy `jwtAccessToken` into the Postman variable `token` (the collection does this automatically via a test script).

**Errors:** `401 User not found!` (unknown email) · `401 Password is Incorrect!` · `403 Your account has been suspended!`

---

#### 📌 GET `/api/auth/me` — 👤 any authenticated role

Returns the current user **with** profile, **without** the password.

**Postman URL:** `{{baseUrl}}/api/auth/me`
**Headers:** `Authorization: Bearer <token>`

**No body.**

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrived succesfully!",
  "data": {
    "profile": {
      "id": "uuid",
      "name": "Rakib Hasan",
      "email": "rakib@example.com",
      "role": "CUSTOMER",
      "activeStatus": "ACTIVE",
      "profile": { "id": "uuid", "profilePhoto": null, "phone": "01712345678", "bio": "Weekend cyclist" }
    }
  }
}
```

**Errors:** `401` missing/invalid token · `403` suspended account.

---

#### 📌 PATCH `/api/auth/me` — 👤 any authenticated role

Updates **your own** profile. Send **at least one field**; omitted fields stay unchanged. Your token stays valid after changing name/email (the middleware re-reads the user from DB).

**Postman URL:** `{{baseUrl}}/api/auth/me`
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Request body (send only what you want to change):**
```json
{
  "name": "Rakib H. (updated)",
  "email": "newemail@example.com",
  "profilePhoto": "https://example.com/new-avatar.jpg",
  "phone": "01799999999",
  "bio": "Now into trekking"
}
```

| Field | Type | Required | Validation / Maps to |
|-------|------|----------|----------------------|
| `name` | string | ❌ (≥1 field total) | trimmed; empty string → `400 Name cannot be empty!` → `User.name` |
| `email` | string | ❌ | trimmed; used by another user → `409 Email is already in use!` → `User.email` |
| `profilePhoto` | string | ❌ | → `Profile.profilePhoto` (upserted) |
| `phone` | string | ❌ | used by another profile → `409 Phone or email is already in use!` → `Profile.phone` |
| `bio` | string | ❌ | → `Profile.bio` |

**Success — `200 OK`:** returns the updated user + profile (same shape as `/auth/me`).

**Errors:** `400 Please provide at least one field to update!` · `400 Name cannot be empty!` · `409` email/phone conflict · `401` unauthenticated.

---

### 8.2 Public Gear & Categories

Base path: `{{baseUrl}}/api` — no authentication required.

---

#### 📌 GET `/api/gear` — 🔓 public

Lists gear with optional filters. All query params are **optional and combinable** (they are AND-ed together).

**Postman URL examples:**
```
{{baseUrl}}/api/gear
{{baseUrl}}/api/gear?categoryId=abc-123&minPrice=100&maxPrice=5000
{{baseUrl}}/api/gear?search=tent&availability=in_stock
```

| Query param | Type | Example | Behavior → Prisma filter |
|-------------|------|---------|--------------------------|
| `categoryId` | uuid | `?categoryId=550e...` | exact match → `GearItem.categoryId` |
| `brand` | string | `?brand=quechua` | case-insensitive contains → `GearItem.brand` |
| `minPrice` | number | `?minPrice=100` | `pricePerDay >= 100`; non-numeric → `400 minPrice must be a number!` |
| `maxPrice` | number | `?maxPrice=5000` | `pricePerDay <= 5000`; non-numeric → `400 maxPrice must be a number!` |
| `search` | string | `?search=tent` | case-insensitive contains on **name OR brand** |
| `availability` | enum | `?availability=in_stock` | `in_stock` → `quantity > 0 AND status = AVAILABLE` · `out_stock` → `quantity = 0 OR status = NOT_AVAILABLE` · other value → `400 availability must be either in_stock or out_stock!` |

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Gear Items Retrieved Successfully!",
  "data": {
    "gearItems": [
      {
        "id": "uuid",
        "name": "Quechua 2P Tent",
        "description": "2 person camping tent",
        "brand": "Quechua",
        "images": ["https://.../1.jpg"],
        "specifications": { "weight": "2.4kg", "capacity": 2 },
        "condition": "GOOD",
        "pricePerDay": "500",
        "securityDeposit": "2000",
        "quantity": 3,
        "status": "AVAILABLE",
        "categoryId": "uuid",
        "providerId": "uuid",
        "category": { "id": "uuid", "name": "Camping" }
      }
    ]
  }
}
```

---

#### 📌 GET `/api/gear/:id` — 🔓 public

Full details of one gear item (all fields incl. `specifications` JSON + `category`).

**Postman URL:** `{{baseUrl}}/api/gear/:id` → path variable `id` = gear item uuid

**Success — `200 OK`:** `{ ..., "data": { "gearItem": { ...full item..., "category": {...} } } }`

**Errors:** `404 Gear Item not found!`

---

#### 📌 GET `/api/categories` — 🔓 public

All categories, newest first.

**Postman URL:** `{{baseUrl}}/api/categories`

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Categories Retrieved Successfully!",
  "data": { "categories": [ { "id": "uuid", "name": "Camping", "description": "...", "image": "..." } ] }
}
```

---

### 8.3 Rental Orders

Base path: `{{baseUrl}}/api` — all routes require **🛒 CUSTOMER**.

---

#### 📌 POST `/api/rentals` — 🛒 CUSTOMER

Places a rental order. Inside one transaction it: validates dates & quantities → checks stock → creates the order + line items with a **price snapshot** → **decrements stock**. `totalAmount` is computed server-side: `Σ (pricePerDay × rentalDays × quantity)`.

**Postman URL:** `{{baseUrl}}/api/rentals`
**Headers:** `Authorization: Bearer <customerToken>`, `Content-Type: application/json`

**Request body:**
```json
{
  "startDate": "2026-11-01",
  "endDate": "2026-11-04",
  "items": [
    { "gearItemId": "39bcc172-17e9-4902-9460-75122f8b2abf", "quantity": 1 },
    { "gearItemId": "5235d212-f73a-4ca4-bf13-a75a1e93a9a2", "quantity": 2 }
  ]
}
```

| Field | Type | Required | Validation / Maps to |
|-------|------|----------|----------------------|
| `startDate` | date string (`YYYY-MM-DD` or ISO) | ✅ | parseable date → `RentalOrder.startDate` |
| `endDate` | date string | ✅ | must be **after** `startDate`; invalid pair → `400 Invalid rental dates!` → `RentalOrder.endDate` |
| `items` | array (min 1) | ✅ | empty → `400 Please select at least one gear item!` |
| `items[].gearItemId` | uuid | ✅ | must exist → `404 One or more gear items were not found!` → `RentalOrderItem.gearItemId` |
| `items[].quantity` | integer > 0 | ✅ | `400 Invalid quantity!` · no duplicates allowed → `400 Duplicate gear items are not allowed!` · stock shortage → `409 Not enough stock for gear item ...!` → `RentalOrderItem.quantity` |

> Server also blocks suspended customers (`403 You have been suspended. You cannot place an order!`).
> Order is created with `status = PLACED` and `totalAmount` computed automatically (don't send it).

**Success — `201 Created`:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "RentalOrder Created Successfully!",
  "data": {
    "result": {
      "id": "uuid",
      "customerId": "uuid",
      "startDate": "2026-11-01T00:00:00.000Z",
      "endDate": "2026-11-04T00:00:00.000Z",
      "totalAmount": "1500",
      "status": "PLACED",
      "items": [ { "id": "uuid", "gearItemId": "uuid", "quantity": 1, "pricePerDay": "500" } ]
    }
  }
}
```

---

#### 📌 GET `/api/rentals` — 🛒 CUSTOMER

All of **your** orders (newest first), including their items.

**Postman URL:** `{{baseUrl}}/api/rentals` · **Headers:** `Authorization: Bearer <token>`

**Success — `200 OK`:** `{ "data": { "rentalOrders": [ { "id", "startDate", "endDate", "totalAmount", "status", "items": [...], "createdAt" } ] } }`

---

#### 📌 GET `/api/rentals/:id` — 🛒 CUSTOMER

One of your orders with full item + gear details.

**Postman URL:** `{{baseUrl}}/api/rentals/:id` → path variable `id` = order uuid

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Rental Order Retrieved Successfully!",
  "data": {
    "rentalOrder": {
      "id": "uuid",
      "status": "PAID",
      "totalAmount": "1500",
      "startDate": "...", "endDate": "...",
      "items": [ { "quantity": 1, "pricePerDay": "500", "gearItem": { "id": "uuid", "name": "Quechua 2P Tent", ... } } ]
    }
  }
}
```

**Errors:** `404 Rental order not found!` · `403 Unauthorized! This is not your rental order.`

---

#### 📌 PATCH `/api/rentals/:id/cancel` — 🛒 CUSTOMER

Cancels **your own** order while it is still `PLACED` or `CONFIRMED`, and **restores the stock** in the same transaction. Orders with `PAID` cannot be cancelled online (refund flow required) — the provider marks those.

**Postman URL:** `{{baseUrl}}/api/rentals/:id/cancel` → path variable `id` = order uuid
**Headers:** `Authorization: Bearer <token>` — **no body**

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Rental Order Cancelled Successfully!",
  "data": { "rentalOrder": { "id": "uuid", "status": "CANCELLED", "totalAmount": "1500", "updatedAt": "..." } }
}
```

**Errors:** `404 Rental order not found!` · `403` not your order · `400 Only PLACED or CONFIRMED orders can be cancelled! Current status: PAID` · `409 Order can no longer be cancelled!` (concurrent update).

---

### 8.4 Payments (Stripe)

Base path: `{{baseUrl}}/api/payments`

**Payment flow:** order must be `CONFIRMED` (by provider) → `POST /create` opens a Stripe Checkout page → customer pays → **Stripe calls `/webhook`** → order becomes `PAID` and payment `COMPLETED`. Use `npm run stripe:listen` for local webhook testing.

---

#### 📌 POST `/api/payments/create` — 🛒 CUSTOMER

Creates (or reuses) a Stripe Checkout session for one of your orders and records a `PENDING` payment row.

**Postman URL:** `{{baseUrl}}/api/payments/create`
**Headers:** `Authorization: Bearer <customerToken>`, `Content-Type: application/json`

**Request body:**
```json
{
  "rentalOrderId": "uuid-of-CONFIRMED-order"
}
```

| Field | Type | Required | Validation / Maps to |
|-------|------|----------|----------------------|
| `rentalOrderId` | uuid | ✅ | `400 rentalOrderId is required!` · must exist & be yours → `404`/`403` · must be `CONFIRMED` → `400` · payment already exists → `409` → `Payment.rentalOrderId` |

**Success — `201 Created`:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Payment checkout session created Successfully!",
  "data": { "result": { "paymentId": "uuid", "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_..." } }
}
```
> Redirect the customer to `checkoutUrl` to complete payment.

**Errors:** `400 Payment already exists for this rental order!` · `400 Rental order must be CONFIRMED before payment!` · `404 Rental order not found!` · `403` not your order.

---

#### 📌 POST `/api/payments/webhook` — 🔓 public (Stripe-signed)

Stripe's callback. Verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET`, then:

- `checkout.session.completed` / `async_payment_succeeded` → payment `PENDING → COMPLETED` (stores `transactionId`, `paidAt`) + order `CONFIRMED → PAID`
- `checkout.session.expired` → payment → `FAILED`

**Postman URL:** `{{baseUrl}}/api/payments/webhook` — do **not** call manually; use `npm run stripe:listen`. Must receive the **raw** body (the app mounts `express.raw` for this route).

**Success — `200`:** `{ "success": true, "statusCode": 200, "message": "Webhook processed successfully!", "data": { "received": true, "processed": true, "paymentId": "uuid", "status": "COMPLETED" } }`

**Errors:** `400 Missing or invalid Stripe signature` · `400 Webhook signature verification failed`.

---

#### 📌 GET `/api/payments` — 🛒 CUSTOMER

Your payment history (newest first), each with its rental order summary.

**Postman URL:** `{{baseUrl}}/api/payments` · **Headers:** `Authorization: Bearer <token>`

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Payment History Retrieved Successfully!",
  "data": {
    "payments": [
      {
        "id": "uuid",
        "amount": "1500",
        "status": "COMPLETED",
        "transactionId": "pi_...",
        "checkoutSessionId": "cs_...",
        "paidAt": "2026-11-01T10:00:00.000Z",
        "createdAt": "...",
        "rentalOrder": { "id": "uuid", "startDate": "...", "endDate": "...", "totalAmount": "1500", "status": "PAID" }
      }
    ]
  }
}
```

---

#### 📌 GET `/api/payments/:id` — 🛒 CUSTOMER

Details of a single payment that belongs to you.

**Postman URL:** `{{baseUrl}}/api/payments/:id` → path variable `id` = payment uuid

**Success — `200 OK`:** same object as above under `"data": { "payment": {...} }`.

**Errors:** `404 Payment not found!` · `403 Unauthorized! This is not your payment.`

---

### 8.5 Reviews

Base path: `{{baseUrl}}/api`

---

#### 📌 POST `/api/reviews` — 🛒 CUSTOMER

Leaves a review for a gear item — **only after one of your rentals containing that item reached `RETURNED`**. One review per `(customer, order, gear item)`.

**Postman URL:** `{{baseUrl}}/api/reviews`
**Headers:** `Authorization: Bearer <customerToken>`, `Content-Type: application/json`

**Request body:**
```json
{
  "gearItemId": "39bcc172-17e9-4902-9460-75122f8b2abf",
  "rating": 5,
  "comment": "Smooth ride, great condition!"
}
```

| Field | Type | Required | Validation / Maps to |
|-------|------|----------|----------------------|
| `gearItemId` | uuid | ✅ | `400 gearItemId is required!` · must exist → `404 Gear Item not found!` → `Review.gearItemId` |
| `rating` | integer 1–5 | ✅ | `400 rating must be an integer between 1 and 5!` → `Review.rating` |
| `comment` | string | ❌ | → `Review.comment` |

The server links `customerId` (from token), `rentalOrderId` (your latest RETURNED order containing the item) automatically.

**Success — `201 Created`:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Review created successfully!",
  "data": {
    "review": {
      "id": "uuid",
      "rating": 5,
      "comment": "Smooth ride, great condition!",
      "createdAt": "...", "updatedAt": "...",
      "customer": { "id": "uuid", "name": "Rakib Hasan" },
      "gearItem": { "id": "uuid", "name": "Aputure 300D II LED Light" }
    }
  }
}
```

**Errors:** `403 You can review this gear only after the rental is RETURNED!` · `409 You have already reviewed this gear for this rental!` · `400` bad rating · `404` gear not found.

---

#### 📌 GET `/api/reviews/gear/:gearItemId` — 🔓 public

All reviews for one gear item plus aggregate rating — ideal to embed in gear details.

**Postman URL:** `{{baseUrl}}/api/reviews/gear/:gearItemId` → path variable `gearItemId` = gear uuid

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reviews Retrieved Successfully!",
  "data": {
    "reviews": [
      { "id": "uuid", "rating": 5, "comment": "...", "createdAt": "...",
        "customer": { "id": "uuid", "name": "Rakib Hasan" },
        "gearItem": { "id": "uuid", "name": "..." } }
    ],
    "averageRating": 4.5,
    "totalReviews": 2
  }
}
```

**Errors:** `404 Gear Item not found!`

---

#### 📌 GET `/api/reviews/my-reviews` — 🛒 CUSTOMER

Every review you have written (newest first).

**Postman URL:** `{{baseUrl}}/api/reviews/my-reviews` · **Headers:** `Authorization: Bearer <token>`

**Success — `200 OK`:** `{ "data": { "reviews": [ { "id", "rating", "comment", "gearItem": {...}, "createdAt" } ] } }`

---

#### 📌 PATCH `/api/reviews/:id` — 🛒 CUSTOMER

Edits **your own** review. Send at least one of `rating`/`comment`.

**Postman URL:** `{{baseUrl}}/api/reviews/:id` → path variable `id` = review uuid
**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Request body:**
```json
{
  "rating": 4,
  "comment": "Revised after second rental"
}
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `rating` | integer 1–5 | ❌ (≥1 field total) | same rule as create |
| `comment` | string | ❌ | — |

**Success — `200 OK`:** updated review object under `"data": { "review": {...} }`.

**Errors:** `400 Please provide rating or comment to update!` · `404 Review not found!` · `403 Unauthorized! This is not your review.`

---

#### 📌 DELETE `/api/reviews/:id` — 🛒 CUSTOMER

Deletes **your own** review.

**Postman URL:** `{{baseUrl}}/api/reviews/:id` · **Headers:** `Authorization: Bearer <token>` — no body

**Success — `200 OK`:** `{ "data": { "review": { "id": "uuid" } } }`

**Errors:** `404 Review not found!` · `403 Unauthorized! This is not your review.`

---

### 8.6 Provider Management

Base path: `{{baseUrl}}/api/provider` — all routes require **🏪 PROVIDER**.

---

#### 📌 POST `/api/provider/gear` — 🏪 PROVIDER

Adds a gear listing to your inventory. Identity is enforced by the unique key `(providerId, name, brand, categoryId, condition)` — adding the same item twice returns `409` (use restock instead).

**Postman URL:** `{{baseUrl}}/api/provider/gear`
**Headers:** `Authorization: Bearer <providerToken>`, `Content-Type: application/json`

**Request body:**
```json
{
  "name": "Quechua 2P Tent",
  "description": "Waterproof 2-person camping tent",
  "brand": "Quechua",
  "categoryId": "uuid-of-category",
  "condition": "GOOD",
  "pricePerDay": 500,
  "securityDeposit": 2000,
  "quantity": 3,
  "status": "AVAILABLE",
  "images": [
    "https://example.com/tent-1.jpg",
    "https://example.com/tent-2.jpg"
  ],
  "specifications": {
    "weight": "2.4kg",
    "capacity": 2,
    "waterColumn": "2000mm"
  }
}
```

| Field | Type | Required | Validation / Maps to |
|-------|------|----------|----------------------|
| `name` | string | ✅ | → `GearItem.name` |
| `description` | string | ✅ | → `GearItem.description` |
| `brand` | string | ❌ | → `GearItem.brand` (part of unique key) |
| `categoryId` | uuid | ✅ | must exist → `404 Category not found!` → `GearItem.categoryId` |
| `condition` | enum | ❌ (default `GOOD`) | `NEW` \| `LIKE_NEW` \| `GOOD` \| `FAIR` → `GearItem.condition` |
| `pricePerDay` | number > 0 | ✅ | `400 pricePerDay must be greater than 0!` → `GearItem.pricePerDay` Decimal(10,2) |
| `securityDeposit` | number | ❌ | → `GearItem.securityDeposit` Decimal(10,2) |
| `quantity` | integer > 0 | ❌ (default `1`) | `400 quantity must be a positive integer!` → `GearItem.quantity` (stock) |
| `status` | enum | ❌ (default `AVAILABLE`) | `AVAILABLE` \| `NOT_AVAILABLE` → `GearItem.status` |
| `images` | string[] | ❌ (default `[]`) | → `GearItem.images` |
| `specifications` | object (JSON) | ❌ (default `null`) | any JSON object → `GearItem.specifications` |

**Success — `201 Created`:**
```json
{ "success": true, "statusCode": 201, "message": "Gear Item Created Successfully!", "data": { "gearItem": { "id": "uuid", "name": "Quechua 2P Tent", "quantity": 3, "status": "AVAILABLE", "pricePerDay": "500", "providerId": "uuid", "categoryId": "uuid" } } }
```

**Errors:** `403 Only providers can create gear listings!` · `403 Your account is not active!` · `404 Category not found!` · `409 This gear already exists for your shop! Use restock to add quantity.`

---

#### 📌 PUT `/api/provider/gear/:id` — 🏪 PROVIDER

Fully updates **your own** listing — send only the fields to change (same field rules as create; all become optional here).

**Postman URL:** `{{baseUrl}}/api/provider/gear/:id` → path variable `id` = gear uuid
**Headers:** `Authorization: Bearer <providerToken>`, `Content-Type: application/json`

**Request body (partial example):**
```json
{
  "pricePerDay": 450,
  "quantity": 10,
  "condition": "LIKE_NEW",
  "description": "Updated description with newer photos",
  "specifications": { "weight": "2.3kg", "capacity": 2 }
}
```
> Use `"securityDeposit": null` to clear it.

**Success — `200 OK`:**
```json
{ "success": true, "statusCode": 200, "message": "Gear Item Updated Successfully!", "data": { "gearItem": { "id": "uuid", "pricePerDay": "450", "quantity": 10, "condition": "LIKE_NEW", "...": "..." } } }
```

**Errors:** `404 Gear item not found!` · `403` not your listing · `400` invalid price/quantity · `409` unique-key conflict.

---

#### 📌 DELETE `/api/provider/gear/:id` — 🏪 PROVIDER

Removes a listing from inventory.

**Postman URL:** `{{baseUrl}}/api/provider/gear/:id` · **Headers:** `Authorization: Bearer <providerToken>` — no body

**Success — `200 OK`:**
```json
{ "success": true, "statusCode": 200, "message": "Gear Item Deleted Successfully!", "data": { "gearItem": { "id": "uuid", "name": "..." } } }
```

**Errors:** `404 Gear item not found!` · `403` not your listing · `409` blocked when the item has rental history.

---

#### 📌 PATCH `/api/provider/gear/:id/stock` — 🏪 PROVIDER

**Increments** stock by the given amount and flips status back to `AVAILABLE`.

**Postman URL:** `{{baseUrl}}/api/provider/gear/:id/stock`
**Headers:** `Authorization: Bearer <providerToken>`, `Content-Type: application/json`

**Request body:**
```json
{ "quantity": 5 }
```

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `quantity` | integer > 0 | ✅ | `400 quantity must be a positive integer!` — amount to **add** |

**Success — `200 OK`:**
```json
{ "success": true, "statusCode": 200, "message": "Gear Item Restocked Successfully!", "data": { "gearItem": { "id": "uuid", "quantity": 8, "status": "AVAILABLE" } } }
```

**Errors:** `404 Gear item not found!` · `403` not your listing.

---

#### 📌 GET `/api/provider/orders` — 🏪 PROVIDER

Incoming rental orders that contain **your** gear (newest first), with customer info and only your own line items.

**Postman URL:** `{{baseUrl}}/api/provider/orders` · **Headers:** `Authorization: Bearer <providerToken>`

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All rental Order retrived successfully!",
  "data": {
    "rentalOrders": [
      {
        "id": "uuid",
        "startDate": "...", "endDate": "...",
        "totalAmount": "1500",
        "status": "PLACED",
        "createdAt": "...",
        "customer": { "name": "Rakib Hasan", "email": "rakib@example.com" },
        "items": [
          { "id": "uuid", "quantity": 1, "pricePerDay": "500",
            "gearItem": { "id": "uuid", "name": "Quechua 2P Tent", "brand": "Quechua", "images": [] } }
        ]
      }
    ]
  }
}
```

---

#### 📌 PATCH `/api/provider/orders/:id` — 🏪 PROVIDER

Updates an order's status through the state machine. Moving to `CANCELLED` or `RETURNED` **restores stock** automatically (in the same transaction).

**Postman URL:** `{{baseUrl}}/api/provider/orders/:id` → path variable `id` = order uuid
**Headers:** `Authorization: Bearer <providerToken>`, `Content-Type: application/json`

**Request body:**
```json
{ "status": "CONFIRMED" }
```

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `status` | enum string | ✅ | `RentalStatus` — see allowed transitions below |

**Allowed transitions:**

| Current status | → Allowed next |
|----------------|----------------|
| `PLACED` | `CONFIRMED`, `CANCELLED` |
| `CONFIRMED` | `PAID`*, `CANCELLED` |
| `PAID` | `PICKED_UP`, `CANCELLED` |
| `PICKED_UP` | `RETURNED` |
| `RETURNED` | *(terminal)* |
| `CANCELLED` | *(terminal)* |

> \* `CONFIRMED → PAID` normally happens via the Stripe webhook.

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Rental status updated successfully!",
  "data": { "updateStatus": { "id": "uuid", "status": "CONFIRMED", "startDate": "...", "endDate": "...", "totalAmount": "1500", "updatedAt": "..." } }
}
```

**Errors:** `400 Rental order status is required!` · `400 Invalid rental order status` · `400 Cannot change status from PAID to PICKED_UP` (illegal transition) · `404 Order not found or access denied`.

---

### 8.7 Admin

Base path: `{{baseUrl}}/api/admin` — except where noted, require **🛡️ ADMIN**.

---

#### 📌 GET `/api/admin/users` — 🛡️ ADMIN

All users (newest first) with profiles, passwords omitted.

**Postman URL:** `{{baseUrl}}/api/admin/users` · **Headers:** `Authorization: Bearer <adminToken>`

**Success — `200 OK`:**
```json
{ "success": true, "statusCode": 200, "message": "All users retrieved successfully!", "data": { "users": [ { "id": "uuid", "name": "...", "email": "...", "role": "CUSTOMER", "activeStatus": "ACTIVE", "profile": { "id": "uuid", "phone": "...", "bio": "..." }, "createdAt": "..." } ] } }
```

---

#### 📌 PATCH `/api/admin/users/:id` — 🛡️ ADMIN

Suspends or reactivates a user. Suspended users cannot log in (403) and are rejected by the auth middleware on every protected route.

**Postman URL:** `{{baseUrl}}/api/admin/users/:id` → path variable `id` = user uuid
**Headers:** `Authorization: Bearer <adminToken>`, `Content-Type: application/json`

**Request body:**
```json
{ "activeStatus": "SUSPEND" }
```

| Field | Type | Required | Values → Maps to |
|-------|------|----------|------------------|
| `activeStatus` | enum string | ✅ | `ACTIVE` \| `SUSPEND` → `User.activeStatus`; invalid → `400 Invalid user status!` |

**Success — `200 OK`:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User status updated successfully!",
  "data": { "user": { "id": "uuid", "name": "...", "email": "...", "role": "CUSTOMER", "activeStatus": "SUSPEND", "profile": { } } }
}
```

**Errors:** `404 User not found!` · `400 Invalid user status!`

---

#### 📌 GET `/api/admin/gear` — 🛡️ ADMIN

All gear listings across all providers (includes `category` and `provider` info, password omitted).

**Postman URL:** `{{baseUrl}}/api/admin/gear` · **Headers:** `Authorization: Bearer <adminToken>`

**Success — `200 OK`:**
```json
{ "success": true, "statusCode": 200, "message": "All gear listings retrieved successfully!", "data": { "gearItems": [ { "id": "uuid", "name": "...", "quantity": 3, "status": "AVAILABLE", "category": { "id": "uuid", "name": "Cycling" }, "provider": { "id": "uuid", "name": "...", "email": "...", "role": "PROVIDER" } } ] } }
```

---

#### 📌 GET `/api/admin/rentals` — 🛡️ ADMIN

All rental orders across the platform (customer + items + gear details).

**Postman URL:** `{{baseUrl}}/api/admin/rentals` · **Headers:** `Authorization: Bearer <adminToken>`

**Success — `200 OK`:**
```json
{ "success": true, "statusCode": 200, "message": "All rental orders retrieved successfully!", "data": { "rentalOrders": [ { "id": "uuid", "status": "PAID", "totalAmount": "1500", "customer": { "id": "uuid", "name": "...", "email": "..." }, "items": [ { "quantity": 1, "pricePerDay": "500", "gearItem": { "id": "uuid", "name": "..." } } ] } ] } }
```

---

#### 📌 POST `/api/admin/categories` — 🛡️ ADMIN

Creates a gear category (needed before providers can add gear in that category).

**Postman URL:** `{{baseUrl}}/api/admin/categories`
**Headers:** `Authorization: Bearer <adminToken>`, `Content-Type: application/json`

**Request body:**
```json
{
  "name": "Camping",
  "description": "Tents, sleeping bags, cooking and camp gear",
  "image": "https://example.com/categories/camping.jpg"
}
```

| Field | Type | Required | Validation / Maps to |
|-------|------|----------|----------------------|
| `name` | string | ✅ | **unique** → duplicate → `409 This Categories Alreay Exists!` → `Category.name` |
| `description` | string | ❌ | → `Category.description` |
| `image` | string (URL) | ❌ | → `Category.image` |

**Success — `201 Created`:**
```json
{ "success": true, "statusCode": 201, "message": "Category Created Successfully!", "data": { "category": { "id": "uuid", "name": "Camping", "description": "Tents, sleeping bags, cooking and camp gear", "image": "https://example.com/categories/camping.jpg" } } }
```

---

#### 📌 GET `/api/admin/categories` — 🔓 public (no auth required)

Categories **with** their nested `gearItems`.

**Postman URL:** `{{baseUrl}}/api/admin/categories`

**Success — `200 OK`:**
```json
{ "success": true, "statusCode": 200, "message": "Categories Retrieved Successfully!", "data": { "categories": [ { "id": "uuid", "name": "Camping", "description": "...", "image": "...", "gearItems": [ { "id": "uuid", "name": "Quechua 2P Tent" } ] } ] } }
```

---

## Complete Workflows (Step-by-Step)

### 🛒 Customer journey

```bash
BASE=http://localhost:3000/api

# 1. Register + login (save jwtAccessToken → use as Bearer token)
curl -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Rakib","email":"rakib@example.com","password":"pass1234","role":"CUSTOMER"}'
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"rakib@example.com","password":"pass1234"}' | jq -r '.data.jwtAccessToken')

# 2. Browse gear (filters: search, availability, brand, minPrice, maxPrice, categoryId)
curl "$BASE/gear?search=tent&availability=in_stock"

# 3. Place an order
curl -X POST $BASE/rentals -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"startDate":"2026-11-01","endDate":"2026-11-04","items":[{"gearItemId":"<ID>","quantity":1}]}'
# → status: PLACED  (stock decremented)

# 4. Wait for provider to CONFIRM, then pay
curl -X POST $BASE/payments/create -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"rentalOrderId":"<ORDER_ID>"}'
# → open data.result.checkoutUrl in browser → pay with Stripe test card 4242 4242 4242 4242
# → webhook flips order to PAID

# 5. Track status
curl $BASE/rentals/$ORDER_ID -H "Authorization: Bearer $TOKEN"
curl $BASE/payments -H "Authorization: Bearer $TOKEN"

# 6. (optional) cancel while PLACED/CONFIRMED
curl -X PATCH $BASE/rentals/$ORDER_ID/cancel -H "Authorization: Bearer $TOKEN"

# 7. After provider marks RETURNED → review the gear
curl -X POST $BASE/reviews -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"gearItemId":"<ID>","rating":5,"comment":"Great!"}'

# 8. Manage profile
curl -X PATCH $BASE/auth/me -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"bio":"Weekend adventurer"}'
```

### 🏪 Provider journey

```bash
# 1. Register with role PROVIDER + login → TOKEN_P

# 2. Create a category if none exists (or ask an admin)
curl -X POST $BASE/admin/categories -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Cycling"}'

# 3. Add gear
curl -X POST $BASE/provider/gear -H "Authorization: Bearer $TOKEN_P" -H 'Content-Type: application/json' \
  -d '{"name":"Trek Bike","description":"Mountain bike","categoryId":"<CAT_ID>","pricePerDay":800,"quantity":2,"condition":"GOOD"}'

# 4. Manage stock
curl -X PATCH $BASE/provider/gear/<GEAR_ID>/stock -H "Authorization: Bearer $TOKEN_P" \
  -H 'Content-Type: application/json' -d '{"quantity":5}'

# 5. View + fulfil incoming orders
curl $BASE/provider/orders -H "Authorization: Bearer $TOKEN_P"
curl -X PATCH $BASE/provider/orders/<ORDER_ID> -H "Authorization: Bearer $TOKEN_P" \
  -H 'Content-Type: application/json' -d '{"status":"CONFIRMED"}'
# PLACED → CONFIRMED → (customer pays → PAID) → PICKED_UP → RETURNED
# CANCELLED / RETURNED automatically restore stock
```

### 🛡️ Admin journey

```bash
# Register with role ADMIN + login → ADMIN_TOKEN

curl $BASE/admin/users     -H "Authorization: Bearer $ADMIN_TOKEN"
curl -X PATCH $BASE/admin/users/<USER_ID> -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H 'Content-Type: application/json' -d '{"activeStatus":"SUSPEND"}'   # or "ACTIVE"
curl $BASE/admin/gear      -H "Authorization: Bearer $ADMIN_TOKEN"
curl $BASE/admin/rentals   -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Using the Postman Collection

1. Import [`postman/GearUp.postman_collection.json`](postman/GearUp.postman_collection.json) into Postman.
2. The collection has two variables:
   - `baseUrl` → `http://localhost:3000` (change for deployment)
   - `token` → filled automatically when you run **Auth → Login** (its test script saves `jwtAccessToken`)
3. Folder order mirrors a real flow: **Auth → Gear → Rentals → Payments → Reviews → Provider → Admin**.
4. Every request already has the correct method, `Authorization: Bearer` header, and a sample JSON body matching the Prisma schema — just replace placeholder IDs (`GEAR_ITEM_ID`, `RENTAL_ORDER_ID`, `CATEGORY_ID`, `USER_ID`, `PAYMENT_ID`, `REVIEW_ID`).
5. For the Stripe webhook, run `npm run stripe:listen` instead of calling it manually.

---

## Project Structure

```
src/
├── app.ts                     # express app + route mounting + 404 + error handler
├── server.ts                  # boot: connect Prisma, listen
├── config/index.ts            # env config
├── lib/                       # prisma & stripe clients
├── middleware/                # auth (JWT + RBAC), 404, global error handler
├── utils/                     # AppError, catchAsync, sendResponse, jwt, restoreOrderStock
└── modules/
    ├── auth/  user/  categories/  admin/
    ├── provider/  public/  rentalOrder/  payments/  reviews/
prisma/
├── schema/                    # multi-file Prisma schema
└── migrations/
postman/
└── GearUp.postman_collection.json
```
