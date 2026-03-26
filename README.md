# 🔧 Mechy — Backend API

> Mechanic Workshop SaaS Backend — Node.js + Express + MongoDB

Mechy is a SaaS platform that gives automobile mechanics a **digital workshop** — inventory management, job billing, customer tracking, worker management, and analytics — all accessible from their phone.

---

## ✨ Features

- **Phone OTP Authentication** — JWT-based (access + refresh tokens)
- **Role-Based Access** — Owner & Customer roles with middleware guards
- **Multi-Tenant Isolation** — Every query scoped by `workshopId` to prevent data leaks
- **Inventory with Stock Ledger** — Append-only audit trail for all stock movements
- **Job Cards & Billing** — Full lifecycle: draft → in-progress → completed → paid
- **Digital Invoice** — Auto-generated on payment, PDF + WhatsApp sharing
- **Worker Management** — Daily wage tracking + task assignment on job cards
- **Supplier & Purchase Orders** — Track suppliers, POs, and outstanding balances
- **Booking System** — Customer books service → Owner confirms via capacity calendar
- **Vehicle Service History** — Chronological timeline per vehicle
- **Smart Analytics** — Revenue, profit, top parts, top customers
- **Offline-First Ready** — API designed for offline sync with conflict resolution

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22 |
| Framework | Express.js 5 |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |
| Validation | Zod v4 |
| Images | Cloudinary |
| Security | Helmet, CORS, Rate Limiting |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 22.x
- **MongoDB** running locally on port `27017`

### Installation

```bash
# Clone the repo
git clone https://github.com/<your-username>/mechy-api.git
cd mechy-api

# Install dependencies
npm install

# Create .env from example
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

### Environment Variables

See [.env.example](.env.example) for all required variables.

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `CLOUDINARY_*` | Cloudinary credentials for image uploads |
| `OTP_BYPASS` | Static OTP for development (remove in prod) |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to phone |
| POST | `/api/auth/verify-otp` | Verify OTP, register/login |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |

### Workshop
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workshop` | Create workshop (owner) |
| GET | `/api/workshop/:id` | Get workshop details |
| PATCH | `/api/workshop/:id` | Update workshop |

> 📌 More endpoints (Parts, Job Cards, Workers, Expenses, Bookings, Invoices, Analytics) coming in Sprint 2–4.

---

## 📁 Project Structure

```
mechy-api/
├── server.js              # Express app entry
├── config/
│   ├── db.js              # MongoDB connection
│   └── cloudinary.js      # Cloudinary config
├── middleware/
│   ├── auth.js            # JWT verification
│   ├── roleGuard.js       # Role-based access
│   ├── tenantScope.js     # Multi-tenant workshopId isolation
│   ├── validate.js        # Zod v4 request validation
│   └── errorHandler.js    # Global error handler
├── models/
│   ├── User.js            # User (owner/customer + vehicles)
│   └── Workshop.js        # Workshop (tenant root)
├── controllers/
│   ├── auth.controller.js
│   └── workshop.controller.js
├── routes/
│   ├── auth.routes.js
│   └── workshop.routes.js
├── .env.example
├── .gitignore
└── package.json
```

---

## 🏗️ Architecture

- **Multi-Tenant SaaS** — `workshopId` on every collection, enforced via middleware
- **Stock Ledger Pattern** — Append-only inventory movements (no direct stock mutation)
- **Offline-First API** — Designed for MMKV + TanStack Query persistence on mobile
- **Modular MVC** — Routes → Controllers → Models with middleware pipeline

---

## 📜 License

ISC
