# 🏦 Double-Entry Backend Ledger Service

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.x-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://mongoosejs.com/)
[![JWT](https://img.shields.io/badge/Auth-JWT%20Blacklist-orange.svg)](https://jwt.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

A production-grade, secure, double-entry financial ledger and transaction backend built with **Node.js**, **Express 5**, and **MongoDB**. Designed around financial engineering principles to ensure **ACID guarantees**, **zero balance discrepancy**, **idempotent operations**, and **secure authentication**.

---

## 📑 Table of Contents

- [Core Principles & Architecture](#-core-principles--architecture)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [Environment Configuration](#-environment-configuration)
- [Getting Started](#-getting-started)
- [API Reference](#-api-reference)
  - [Authentication Routes](#1-authentication-routes-apiauth)
  - [Account Management](#2-account-management-apiaccounts)
  - [Transactions & Ledger](#3-transaction-routes-apitransactions)
- [Security Implementations](#-security-implementations)
- [Interview & System Design Highlights](#-interview--system-design-highlights)

---

## 🏛 Core Principles & Architecture

### 1. Double-Entry Bookkeeping System
In standard banking and fintech systems, money is never simply "incremented" or "decremented" on an account record. Every financial event must have an equal and opposite entry:
$$\sum \text{Debits} = \sum \text{Credits}$$

- **Debit Entry**: Represents an outflow or reduction from the sender's account.
- **Credit Entry**: Represents an inflow or increase into the recipient's account.
- **Ledger Invariant**: A transaction is invalid and aborted if debit and credit legs do not balance to zero.

### 2. ACID Multi-Document Transactions
Money movement uses MongoDB Client Sessions with replica-set transactions. If an error, balance insufficiency, or crash occurs mid-flight, the entire operation is automatically rolled back to prevent phantom debits or credits.

### 3. Idempotency Key Pattern
Network retries should never cause duplicate payments. Clients supply an `Idempotency-Key` header with each transfer request. If a request with an existing idempotency key is received, the server returns the cached transaction result without re-executing ledger movements.

---

## 🚀 Key Features

- **Robust Input Validation & Sanitization**: Comprehensive field checks, RFC-compliant email regex, and minimum password entropy checks.
- **Secure JWT Auth & Blacklisting**: Token generation with expiration, HTTP-only cookie support, and database-backed token blacklisting on logout.
- **Account Lifecycle Management**: Create user checking/savings accounts with balance tracking and system-level master accounts.
- **Asynchronous Notifications**: Fire-and-forget email dispatch using Nodemailer without blocking API responses.
- **Centralized Error Handling**: Standardized error responses across all controllers.

---

## 🛠 Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Runtime** | Node.js | Asynchronous, event-driven JavaScript runtime |
| **Framework** | Express.js 5.x | Web framework with native async error handling |
| **Database** | MongoDB & Mongoose | Document database with multi-document ACID transactions |
| **Security** | bcryptjs & jsonwebtoken | Password hashing (salt rounds: 10) & JWT token signing |
| **Middleware** | cookie-parser | Parses cookie headers for secure HTTP-only token transport |
| **Mailing** | nodemailer | Automated onboarding and notification emails |

---

## 📁 Project Directory Structure

```text
backend-ledger/
├── src/
│   ├── app.js                     # Express app configuration & middleware
│   ├── config/
│   │   └── db.js                  # MongoDB Mongoose connection handler
│   ├── controllers/
│   │   ├── auth.controller.js     # User registration, login, and logout
│   │   ├── account.controller.js  # Account creation, listing, and balance checks
│   │   └── transaction.controller.js # Transfer funds, ledger reconciliation
│   ├── middleware/
│   │   └── auth.middleware.js     # JWT verification & token blacklist check
│   ├── models/
│   │   ├── user.model.js          # User schema with bcrypt pre-save hook
│   │   ├── account.model.js       # Account balance & metadata schema
│   │   ├── transaction.model.js   # Transaction records with idempotency key
│   │   ├── ledger.model.js        # Double-entry debit/credit ledger records
│   │   └── blackList.model.js     # Expired/logged-out JWT token blacklist
│   ├── routes/
│   │   ├── auth.routes.js         # /api/auth routes
│   │   ├── account.routes.js      # /api/accounts routes
│   │   └── transaction.routes.js  # /api/transactions routes
│   └── services/
│       └── email.service.js       # Asynchronous email sender service
├── .env.example                   # Safe template of environment variables
├── .gitignore                     # Git exclusion rules (node_modules, .env, logs)
├── package.json                   # Project metadata, dependencies, and scripts
├── server.js                      # Application entry point & HTTP listener
└── README.md                      # Project documentation (this file)
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```env
PORT=3000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/bank_ledger
JWT_SECRET=your_super_secret_jwt_key_here

# Optional: Email Service Credentials
EMAIL_USER=your_email@gmail.com
CLIENT_ID=your_oauth_client_id
CLIENT_SECRET=your_oauth_client_secret
REFRESH_TOKEN=your_oauth_refresh_token
```

---

## 🏁 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MongoDB](https://www.mongodb.com/) (Running locally or MongoDB Atlas)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/backend-ledger.git
   cd backend-ledger
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Environment Variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your local database URI and JWT secret
   ```

4. **Start the application**:
   ```bash
   # Production mode
   npm start

   # Development mode with hot-reload (requires nodemon)
   npm run dev
   ```

5. **Verify the server is running**:
   ```bash
   curl http://localhost:3000/
   # Output: Ledger Service is up and running
   ```

---

## 📡 API Reference

### 1. Authentication Routes (`/api/auth`)

#### `POST /api/auth/register`
Creates a new user account with validated credentials and returns a JWT token.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "Password@123"
}
```

**Success Response (`201 Created`):**
```json
{
  "status": "success",
  "user": {
    "_id": "60d0fe4f5311236168a109ca",
    "email": "jane@example.com",
    "name": "Jane Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC..."
}
```

**Validation Error Response (`400 Bad Request`):**
```json
{
  "status": "failed",
  "message": "Validation failed",
  "errors": [
    "A valid email address is required (e.g. user@example.com)",
    "Password is required and must be at least 6 characters long"
  ]
}
```

---

#### `POST /api/auth/login`
Authenticates a user and issues a JWT token via cookie and response body.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "Password@123"
}
```

**Success Response (`200 OK`):**
```json
{
  "status": "success",
  "user": {
    "_id": "60d0fe4f5311236168a109ca",
    "email": "jane@example.com",
    "name": "Jane Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVC..."
}
```

---

#### `POST /api/auth/logout`
Invalidates the current session by adding the JWT token to the MongoDB token blacklist.

**Headers:** `Authorization: Bearer <token>` (or via `token` cookie)

**Success Response (`200 OK`):**
```json
{
  "status": "success",
  "message": "User logged out successfully"
}
```

---

### 2. Account Management (`/api/accounts`)
*Requires `Authorization: Bearer <token>`*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/accounts` | Create a new financial account for the user |
| `GET` | `/api/accounts` | Retrieve all accounts belonging to the user |
| `GET` | `/api/accounts/:accountId` | Fetch specific account details & balance |

---

### 3. Transaction Routes (`/api/transactions`)
*Requires `Authorization: Bearer <token>`*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/transactions/transfer` | Execute atomic transfer between accounts |
| `GET` | `/api/transactions/history/:accountId` | Retrieve double-entry transaction history |

---

## 🔒 Security Implementations

1. **Password Hashing**: Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` with 10 salt rounds inside a Mongoose `pre("save")` hook.
2. **Exclusion of Sensitive Fields**: The password field is configured with `select: false` on the User schema, preventing it from ever being returned in queries accidentally.
3. **HTTP-Only Cookies**: JWT tokens are issued with `httpOnly: true`, preventing client-side Cross-Site Scripting (XSS) access.
4. **Token Revocation (Blacklisting)**: Logged-out tokens are stored with TTL in a blacklist collection to prevent token replay attacks.
5. **No Leaked Sensitive Information**: Log outputs are sanitized; credentials and connection strings are strictly managed through environment variables.

---

## 💡 Interview & System Design Highlights

- **Concurrency & Race Conditions**: How do we prevent negative balances under concurrent requests? By using database transactions and conditional atomic updates (`$inc` with `$gte: amount`).
- **Idempotency**: Prevents double-spending when network timeouts happen between client and server.
- **Auditability**: In a double-entry ledger, history is append-only. Transactions are never mutated or deleted; any reversal is executed as a compensatory journal entry.

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
