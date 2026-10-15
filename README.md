# GearUp 🏋️

**"Rent Sports & Outdoor Gear Instantly"**

Backend API for a sports & outdoor equipment rental service. Customers browse and rent gear, providers manage inventory and fulfill orders, and admins moderate the platform.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js + Express 5 | REST API |
| TypeScript (ESM) | Type safety |
| PostgreSQL + Prisma 7 | Database & ORM |
| JWT (httpOnly cookie + Bearer) | Authentication |
| Stripe Checkout | Payment integration |
| bcrypt | Password hashing |

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# edit .env with your DATABASE_URL, JWT secrets and Stripe keys

# 3. Apply migrations & generate client
npx prisma migrate dev

# 4. Start dev server
npm run dev
```

Server runs at `http://localhost:3000`.

## Environment Variables

See [`.env.example`](.env.example) — `PORT`, `APP_URL`, `DATABASE_URL`, `BCRYPT_SALT_ROUNDS`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `STRIPE_SECRET_KEY`, `STRIPE_PRODUCT_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.

> Stripe webhook local testing: `npm run stripe:listen` (forwarded to `/api/payments/webhook`).

## Roles

| Role | Permissions |
|------|-------------|
| **Customer** | Browse gear, place rental orders, pay, track status, cancel (before payment), leave reviews, manage own profile |
| **Provider** | Add/edit/remove gear, manage stock, view incoming orders, update order status |
| **Admin** | Manage all users (suspend/activate), oversee all gear & rentals, manage categories |

Roles are chosen by the user at registration (`POST /api/auth/register`).

**Admin credentials:** register via `POST /api/auth/register` with `"role": "ADMIN"` (or use your deployed admin account).

## API Endpoints

Base URL: `/api`

### Authentication
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| GET | `/auth/me` | authenticated |
| PATCH | `/auth/me` | authenticated (update name, email, profilePhoto, phone, bio) |

### Gear & Categories (public)
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/gear` | public |
| GET | `/gear/:id` | public |
| GET | `/categories` | public |

`GET /gear` query params: `categoryId`, `brand`, `minPrice`, `maxPrice`, `search` (name/brand), `availability` (`in_stock` \| `out_stock`).

### Rental Orders
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/rentals` | CUSTOMER |
| GET | `/rentals` | CUSTOMER |
| GET | `/rentals/:id` | CUSTOMER |
| PATCH | `/rentals/:id/cancel` | CUSTOMER (PLACED/CONFIRMED only) |

Order status flow:

```
PLACED → CONFIRMED → PAID → PICKED_UP → RETURNED
   \          \         \                  (terminal)
    \          \         → CANCELLED (terminal)
     → CANCELLED            → CANCELLED
```

Stock is decremented atomically when an order is created and restored on CANCELLED/RETURNED.

### Payments (Stripe)
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/payments/create` | CUSTOMER — creates Stripe Checkout session (order must be CONFIRMED) |
| POST | `/payments/webhook` | public — Stripe callback, verifies signature, marks order PAID |
| GET | `/payments` | CUSTOMER — payment history |
| GET | `/payments/:id` | CUSTOMER — payment details |

Payment statuses: `PENDING` → `COMPLETED` (webhook) or `FAILED` (session expired).

### Reviews
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/reviews` | CUSTOMER — only after the rental is RETURNED |
| GET | `/reviews/gear/:gearItemId` | public — includes `averageRating` & `totalReviews` |
| GET | `/reviews/my-reviews` | CUSTOMER |
| PATCH | `/reviews/:id` | CUSTOMER (own review) |
| DELETE | `/reviews/:id` | CUSTOMER (own review) |

### Provider
| Method | Endpoint | Access |
|--------|----------|--------|
| POST | `/provider/gear` | PROVIDER |
| PUT | `/provider/gear/:id` | PROVIDER |
| DELETE | `/provider/gear/:id` | PROVIDER |
| PATCH | `/provider/gear/:id/stock` | PROVIDER — restock |
| GET | `/provider/orders` | PROVIDER |
| PATCH | `/provider/orders/:id` | PROVIDER — update status |

### Admin
| Method | Endpoint | Access |
|--------|----------|--------|
| GET | `/admin/users` | ADMIN |
| PATCH | `/admin/users/:id` | ADMIN — suspend/activate |
| GET | `/admin/gear` | ADMIN |
| GET | `/admin/rentals` | ADMIN |
| POST | `/admin/categories` | ADMIN |
| GET | `/admin/categories` | public |

## Response Format

Success:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Gear Items Retrieved Successfully!",
  "data": { "gearItems": [] }
}
```

Error:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "rating must be an integer between 1 and 5!"
}
```

Unknown routes return a structured 404:
```json
{ "success": false, "statusCode": 404, "message": "Route GET /api/nope not found!" }
```

## Database Schema

Multi-file Prisma schema in [`prisma/schema/`](prisma/schema/):

- **Users** — auth details, role (`CUSTOMER`/`PROVIDER`/`ADMIN`), status (`ACTIVE`/`SUSPEND`)
- **Profiles** — profilePhoto, phone, bio (1:1 with User)
- **Categories** — gear categories
- **GearItems** — listings linked to provider: price, quantity (stock), status, specifications, images
- **RentalOrders / RentalOrderItems** — dates, total, status, line items with price snapshot
- **Payments** — transactionId, amount, status, paidAt (unique per rental order)
- **Reviews** — rating, comment; unique per (customer, rental order, gear item)

## API Documentation

Postman collection: [`postman/GearUp.postman_collection.json`](postman/GearUp.postman_collection.json)

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run stripe:listen` | Forward Stripe webhooks to localhost |
