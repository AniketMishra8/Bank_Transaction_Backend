# 📒 Backend Ledger — Complete Project Documentation

## 📌 Project Overview

**Backend Ledger** is a full-stack banking ledger system built with **Node.js**, **Express.js**, and **MongoDB**. It implements a **double-entry bookkeeping** pattern where every financial transaction creates both a DEBIT and CREDIT ledger entry, ensuring an immutable, auditable financial trail. The frontend is built with **vanilla HTML, CSS, and JavaScript** as a Single Page Application (SPA).

---

## 🏗️ Project Architecture

```
backend-ledger-main/
│
├── server.js                        # Entry point — starts Express server on port 3000
├── .env                             # Environment variables (MongoDB URI, JWT secret)
├── package.json                     # Dependencies and scripts
│
├── public/                          # 🆕 Frontend (Static SPA)
│   ├── index.html                   # Main HTML file (all pages/views)
│   ├── style.css                    # Complete CSS design system
│   └── app.js                       # SPA logic (auth, accounts, transfers)
│
└── src/                             # Backend source code
    ├── app.js                       # Express app setup, middleware, route mounting
    │
    ├── config/
    │   └── db.js                    # MongoDB connection via Mongoose
    │
    ├── models/                      # Mongoose schemas
    │   ├── user.model.js            # User schema (email, name, password + bcrypt)
    │   ├── account.model.js         # Account schema (user ref, status, currency)
    │   ├── transaction.model.js     # Transaction schema (from/to, amount, status, idempotencyKey)
    │   ├── ledger.model.js          # Ledger entry schema (IMMUTABLE — DEBIT/CREDIT)
    │   └── blackList.model.js       # JWT token blacklist (for logout, TTL index)
    │
    ├── controllers/                 # Business logic handlers
    │   ├── auth.controller.js       # Register, Login, Logout
    │   ├── account.controller.js    # Create account, Get accounts, Get balance
    │   └── transaction.controller.js # Create transaction, Initial funds (system user)
    │
    ├── middleware/
    │   └── auth.middleware.js        # JWT verification + token blacklist check
    │
    ├── routes/                      # Route definitions
    │   ├── auth.routes.js           # /api/auth/*
    │   ├── account.routes.js        # /api/accounts/*
    │   └── transaction.routes.js    # /api/transactions/*
    │
    └── services/
        └── email.service.js         # Nodemailer email service (registration, transaction alerts)
```

---

## 🔄 Complete Application Flow

### How the Application Starts

```
1. server.js loads
   ├── Loads environment variables via dotenv
   ├── Imports Express app from src/app.js
   ├── Calls connectToDB() to connect to MongoDB
   └── Starts HTTP server on port 3000

2. src/app.js configures Express
   ├── Adds express.json() middleware (parse JSON bodies)
   ├── Adds cookieParser() middleware (parse cookies)
   ├── Serves static files from /public directory
   ├── Mounts API routes:
   │   ├── /api/auth → auth.routes.js
   │   ├── /api/accounts → account.routes.js
   │   └── /api/transactions → transaction.routes.js
   └── Catch-all route serves index.html for SPA
```

### User Registration Flow

```
Frontend (Register Form)
    │
    ▼
POST /api/auth/register  { email, password, name }
    │
    ▼
auth.controller.js → userRegisterController()
    ├── 1. Check if email already exists in DB
    ├── 2. Create user (password auto-hashed via pre('save') hook with bcryptjs)
    ├── 3. Sign JWT token with userId (expires in 3 days)
    ├── 4. Set token as HTTP cookie
    ├── 5. Return user object + token
    └── 6. Send welcome email via Nodemailer (async, non-blocking)
```

### User Login Flow

```
Frontend (Login Form)
    │
    ▼
POST /api/auth/login  { email, password }
    │
    ▼
auth.controller.js → userLoginController()
    ├── 1. Find user by email (with +password field selected)
    ├── 2. Compare password using bcrypt.compare()
    ├── 3. Sign JWT token with userId (expires in 3 days)
    ├── 4. Set token as HTTP cookie
    └── 5. Return user object + token
```

### User Logout Flow

```
Frontend (Logout Button)
    │
    ▼
POST /api/auth/logout
    │
    ▼
auth.controller.js → userLogoutController()
    ├── 1. Extract token from cookie or Authorization header
    ├── 2. Add token to BlackList collection (invalidates it)
    ├── 3. Clear the HTTP cookie
    └── 4. Return success message
```

### Account Creation Flow

```
Frontend (Create Account Button)
    │
    ▼
POST /api/accounts/  [Protected Route — needs JWT]
    │
    ▼
authMiddleware()
    ├── Extract JWT from cookie/header
    ├── Check if token is blacklisted
    ├── Verify JWT and decode userId
    └── Attach user to req.user
    │
    ▼
account.controller.js → createAccountController()
    ├── Create account linked to req.user._id
    ├── Default status: ACTIVE, currency: INR
    └── Return created account
```

### Get Accounts + Balance Flow

```
Frontend (Dashboard / Accounts Page)
    │
    ▼
GET /api/accounts/  [Protected]
    │  Returns all accounts for logged-in user
    │
    ▼ (For each account)
GET /api/accounts/balance/:accountId  [Protected]
    │
    ▼
account.model.js → getBalance()
    ├── MongoDB Aggregation Pipeline:
    │   ├── $match: filter ledger entries for this account
    │   ├── $group: sum DEBIT entries and CREDIT entries separately
    │   └── $project: balance = totalCredit - totalDebit
    └── Returns computed balance (no stored balance field!)
```

### 💸 Transaction (Fund Transfer) Flow — THE 10-STEP PROCESS

This is the **most important** and **most complex** part of the project:

```
Frontend (Transfer Form)
    │
    ▼
POST /api/transactions/  { fromAccount, toAccount, amount, idempotencyKey }
    │
    ▼
transaction.controller.js → createTransaction()

STEP 1: Validate Request
    └── Check all required fields are present

STEP 2: Validate Idempotency Key
    ├── Check if transaction with this key already exists
    ├── If COMPLETED → return existing transaction (prevents duplicate charges)
    ├── If PENDING → inform client it's still processing
    ├── If FAILED/REVERSED → inform client to retry
    └── If new → proceed

STEP 3: Check Account Status
    └── Both fromAccount and toAccount must be ACTIVE

STEP 4: Derive Sender Balance from Ledger
    ├── Call fromUserAccount.getBalance() (aggregation pipeline)
    └── If balance < amount → reject (insufficient funds)

STEP 5: Create Transaction Record (status: PENDING)
    └── Inside MongoDB Session (ACID transaction begins)

STEP 6: Create DEBIT Ledger Entry
    └── { account: fromAccount, type: "DEBIT", amount } — within session

STEP 7: (Simulated delay — 15 seconds)
    └── Demonstrates real-world processing time

STEP 8: Create CREDIT Ledger Entry
    └── { account: toAccount, type: "CREDIT", amount } — within session

STEP 9: Mark Transaction as COMPLETED
    └── Update status within the same session

STEP 10: Commit MongoDB Session
    ├── If ANY step fails → entire session is rolled back (ACID!)
    └── Send transaction email notification

STEP 11: Return Success Response
```

### System User Initial Funds Flow

```
POST /api/transactions/system/initial-funds  [System User Only]
    │
    ▼
authSystemUserMiddleware()
    ├── Verify JWT
    ├── Check user.systemUser === true (immutable field)
    └── Only system users can add initial funds (money creation)
    │
    ▼
transaction.controller.js → createInitialFundsTransaction()
    ├── Find system user's own account (as source)
    ├── Create PENDING transaction within MongoDB session
    ├── Create DEBIT entry (from system account)
    ├── Create CREDIT entry (to target account)
    ├── Mark COMPLETED
    └── Commit session
```

---

## 🔌 API Routes Reference

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login user |
| POST | `/api/auth/logout` | ❌ | Logout (blacklist token) |

### Account Routes (`/api/accounts`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/accounts/` | ✅ `authMiddleware` | Create new account |
| GET | `/api/accounts/` | ✅ `authMiddleware` | Get all user accounts |
| GET | `/api/accounts/balance/:accountId` | ✅ `authMiddleware` | Get account balance |

### Transaction Routes (`/api/transactions`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/transactions/` | ✅ `authMiddleware` | Transfer funds between accounts |
| POST | `/api/transactions/system/initial-funds` | ✅ `authSystemUserMiddleware` | Add initial funds (system user only) |

---

## 📚 Libraries & Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| **express** | ^5.2.1 | Web framework for building REST APIs |
| **mongoose** | ^9.10.1 | MongoDB ODM (Object Document Mapper) |
| **bcryptjs** | ^3.0.3 | Password hashing with salt rounds |
| **jsonwebtoken** | ^9.0.3 | JWT token generation and verification |
| **cookie-parser** | ^1.4.7 | Parse HTTP cookies in requests |
| **dotenv** | ^17.4.2 | Load environment variables from .env file |
| **nodemailer** | ^7.0.13 | Send emails (registration, transaction alerts) |

---

## ⚙️ Key Functions Reference

### Models

| Function | File | Description |
|----------|------|-------------|
| `userSchema.pre('save')` | user.model.js | Pre-save hook that hashes password with bcrypt (10 salt rounds) |
| `user.comparePassword(password)` | user.model.js | Instance method: compares plain text password with hashed password |
| `account.getBalance()` | account.model.js | Instance method: runs MongoDB aggregation pipeline to compute balance from ledger entries |
| `preventLedgerModification()` | ledger.model.js | Pre-hook on multiple operations to make ledger entries **immutable** |

### Controllers

| Function | File | Description |
|----------|------|-------------|
| `userRegisterController` | auth.controller.js | Registers user, hashes password, signs JWT, sends email |
| `userLoginController` | auth.controller.js | Validates credentials, signs JWT, sets cookie |
| `userLogoutController` | auth.controller.js | Blacklists token, clears cookie |
| `createAccountController` | account.controller.js | Creates new bank account for authenticated user |
| `getUserAccountsController` | account.controller.js | Returns all accounts for current user |
| `getAccountBalanceController` | account.controller.js | Returns computed balance for specific account |
| `createTransaction` | transaction.controller.js | **10-step ACID transfer** with idempotency, sessions, double-entry |
| `createInitialFundsTransaction` | transaction.controller.js | System user adds initial funds to an account |

### Middleware

| Function | File | Description |
|----------|------|-------------|
| `authMiddleware` | auth.middleware.js | Verifies JWT, checks blacklist, attaches user to request |
| `authSystemUserMiddleware` | auth.middleware.js | Same as above + checks `systemUser: true` flag |

### Services

| Function | File | Description |
|----------|------|-------------|
| `sendRegistrationEmail` | email.service.js | Sends welcome email after registration |
| `sendTransactionEmail` | email.service.js | Sends transaction success notification |
| `sendTransactionFailureEmail` | email.service.js | Sends transaction failure notification |

---

## 🧠 Important Concepts & Topics Used

### 1. **Double-Entry Bookkeeping (Ledger Pattern)**
- Every financial transaction creates **two** ledger entries: one DEBIT and one CREDIT
- Balance is **never stored** — it's always **derived** by aggregating ledger entries
- Ledger entries are **immutable** — they cannot be modified or deleted once created
- This prevents fraud and ensures a complete audit trail

### 2. **ACID Transactions (MongoDB Sessions)**
- Uses `mongoose.startSession()` and `session.startTransaction()`
- All ledger operations happen within a single session
- If any step fails, the entire session is **rolled back** — no partial transactions
- `session.commitTransaction()` makes all changes permanent atomically

### 3. **Idempotency**
- Every transaction requires a unique `idempotencyKey`
- If the same key is submitted twice, the server returns the existing result instead of processing again
- Prevents **duplicate charges** due to network retries or user double-clicks

### 4. **JWT Authentication**
- Stateless authentication using JSON Web Tokens
- Token contains `userId` payload, expires after 3 days
- Token is sent via both HTTP cookies and Authorization header
- Supports dual extraction: `req.cookies.token || req.headers.authorization?.split(" ")[1]`

### 5. **Token Blacklisting (Logout Strategy)**
- On logout, the JWT is added to a `tokenBlackList` MongoDB collection
- Uses MongoDB **TTL Index** (`expireAfterSeconds: 3 days`) to auto-delete expired tokens
- Every authenticated request checks the blacklist before proceeding

### 6. **Password Security (bcrypt)**
- Passwords are **never stored in plaintext**
- `pre('save')` Mongoose hook automatically hashes passwords
- Uses `bcrypt.hash()` with 10 salt rounds
- `password` field has `select: false` — excluded from queries by default

### 7. **MongoDB Aggregation Pipeline**
- Used in `account.getBalance()` to compute balance from ledger entries
- Pipeline stages: `$match` → `$group` → `$project`
- Conditional sums using `$cond` to separate DEBIT and CREDIT amounts

### 8. **Mongoose Schema Design**
- References between collections using `ObjectId` with `ref`
- Compound indexes for query optimization: `{ user: 1, status: 1 }`
- Immutable fields using `immutable: true`
- Enum validation with custom error messages
- Timestamps enabled for audit tracking

### 9. **MVC Architecture**
- **Models**: Database schemas and data logic
- **Controllers**: Business logic handlers
- **Routes**: HTTP endpoint definitions
- **Services**: Reusable utilities (email)
- **Middleware**: Cross-cutting concerns (authentication)

### 10. **System User Pattern**
- Special user type with `systemUser: true` (immutable)
- Only system users can create initial funds (money from nothing)
- Separate middleware `authSystemUserMiddleware` enforces this

### 11. **Immutable Ledger Pattern**
- Pre-hooks on `findOneAndUpdate`, `updateOne`, `deleteOne`, `remove`, `deleteMany`, `updateMany`, `findOneAndDelete`, `findOneAndReplace`
- All these operations throw an error, making ledger entries write-once

### 12. **Email Notifications (Nodemailer)**
- OAuth2 authentication with Gmail
- Sends HTML + plaintext emails
- Non-blocking: registration email sent after response

---

## 🖥️ Frontend Architecture (SPA)

### Technology
- **HTML5** — Semantic structure, single `index.html` file
- **CSS3** — Custom design system with CSS variables, glassmorphism, animations
- **Vanilla JavaScript** — IIFE pattern, no frameworks needed

### Frontend Flow

```
Page Load
    ├── Check localStorage for saved session (token + user)
    ├── If valid session → show Dashboard (load accounts & balances)
    └── If no session → show Login/Register page
    
User Interaction Flow:
    Login/Register → Save token to localStorage → Show Dashboard
    Dashboard → Fetch accounts → Fetch balance for each → Render stats & list
    Accounts Page → Fetch accounts → Render account cards with balances
    Transfer Page → Load accounts into dropdown → Submit transfer with idempotency key
    Logout → Call API → Clear localStorage → Show Login page
```

### Key Frontend Features
- **Single Page Application** — No page reloads, smooth navigation
- **Toast Notifications** — Success/error messages with slide animations
- **Loading Overlay** — Spinner during API calls
- **Password Toggle** — Show/hide password functionality
- **Auto Idempotency Key** — Generated client-side for each transfer
- **Responsive Design** — Works on mobile, tablet, and desktop
- **Dark Theme** — Premium dark UI with glassmorphism effects

---

## 🚀 How to Run the Project

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** (running locally on port 27017, or update MONGO_URI in .env)
- **MongoDB Replica Set** (required for transactions/sessions — use `mongod --replSet rs0`)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Start MongoDB (must be a replica set for transactions!)
# Option A: If using mongod directly:
mongod --replSet rs0
# Then in mongosh: rs.initiate()

# Option B: If using MongoDB Atlas, replica sets are enabled by default

# 3. Start the server (development mode with auto-reload)
npm run dev

# 4. Open in browser
# http://localhost:3000
```

### Environment Variables (.env)
```
MONGO_URI=mongodb://localhost:27017/Bankprocess
JWT_SECRET=your_jwt_secret_here

# For email service (optional):
EMAIL_USER=your_email@gmail.com
CLIENT_ID=your_oauth_client_id
CLIENT_SECRET=your_oauth_client_secret
REFRESH_TOKEN=your_refresh_token
```

---

## 🎯 Is This Project Good for Infosys Off-Campus Face-to-Face Interview?

### ✅ YES — Here's Why It's a STRONG Project:

#### 1. **Demonstrates Real-World Backend Concepts**
This is not a basic CRUD project. It implements **double-entry bookkeeping**, **ACID transactions**, **idempotency**, and **token blacklisting** — concepts used in **production banking systems**. Infosys interviewers will be impressed by the depth.

#### 2. **Covers All Key Topics Infosys Tests**
| Infosys Interview Topic | Covered in This Project? |
|---|---|
| REST API Design | ✅ Full CRUD with proper HTTP methods & status codes |
| Database Design | ✅ MongoDB schemas with relationships, indexes, enums |
| Authentication & Authorization | ✅ JWT, bcrypt, middleware, role-based access |
| Error Handling | ✅ Validation, status codes, try-catch blocks |
| Security | ✅ Password hashing, token blacklisting, immutable data |
| MVC Architecture | ✅ Clean separation: models, controllers, routes, services |
| Data Structures | ✅ Aggregation pipeline, conditional logic |
| Problem Solving | ✅ Idempotency, ACID transactions, balance derivation |

#### 3. **Shows Advanced MongoDB Knowledge**
- Aggregation pipelines (`$match`, `$group`, `$cond`, `$project`)
- Sessions & transactions (ACID)
- TTL indexes for auto-cleanup
- Compound indexes for performance
- Immutable fields

#### 4. **Demonstrates Clean Code Practices**
- Modular architecture (MVC + services)
- Consistent error handling
- Input validation
- Environment variable management
- Proper status codes (201, 200, 400, 401, 403, 404, 422, 500)

#### 5. **Full-Stack Capability**
With the frontend, you can demonstrate that you can build **end-to-end** solutions, not just APIs.

### ⚠️ Tips to Make It Even Stronger for the Interview

1. **Be prepared to explain the 10-step transaction flow in detail** — This is your strongest talking point
2. **Understand why balance is derived, not stored** — It prevents race conditions and ensures consistency
3. **Know what idempotency means** and give real-world examples (payment retries, network failures)
4. **Understand ACID properties** — Atomicity, Consistency, Isolation, Durability
5. **Explain the token blacklist TTL strategy** — Why 3 days? Because JWT expires in 3 days
6. **Be ready to discuss scaling** — What if you had millions of transactions? (sharding, read replicas, caching)
7. **Know the difference between `pre('save')` and `pre('validate')`** in Mongoose
8. **Understand why `select: false`** is used on the password field

### 📝 Common Interview Questions This Project Can Answer

1. *"Tell me about a project you've built"* → Describe the double-entry ledger system
2. *"How do you handle authentication?"* → JWT + cookies + token blacklisting
3. *"How do you ensure data integrity?"* → ACID transactions, immutable ledger, idempotency
4. *"What is your database design?"* → 5 interconnected collections with referencing
5. *"How do you handle errors?"* → Try-catch, proper HTTP status codes, validation
6. *"What design patterns do you use?"* → MVC, middleware pattern, service layer
7. *"How do you secure passwords?"* → bcrypt hashing with salt rounds
8. *"What's the most complex feature you've built?"* → The 10-step ACID transaction flow

---

## 📊 Database Schema Diagram

```
┌──────────────────┐       ┌──────────────────┐
│      users       │       │  tokenBlackList  │
├──────────────────┤       ├──────────────────┤
│ _id              │       │ _id              │
│ email (unique)   │       │ token (unique)   │
│ name             │       │ createdAt (TTL)  │
│ password (hash)  │       └──────────────────┘
│ systemUser       │
│ createdAt        │
│ updatedAt        │
└──────┬───────────┘
       │ 1:N
       ▼
┌──────────────────┐
│    accounts      │
├──────────────────┤
│ _id              │
│ user (→ users)   │
│ status (enum)    │
│ currency         │
│ createdAt        │
│ updatedAt        │
└──────┬───────────┘
       │ 1:N (fromAccount / toAccount)
       ▼
┌────────────────────┐      ┌──────────────────┐
│   transactions     │      │     ledger       │
├────────────────────┤      ├──────────────────┤
│ _id                │◄─────│ transaction (ref)│
│ fromAccount (ref)  │      │ account (ref) ──►│accounts│
│ toAccount (ref)    │      │ amount           │
│ amount             │      │ type (DEBIT/     │
│ status (enum)      │      │       CREDIT)    │
│ idempotencyKey     │      │ (IMMUTABLE)      │
│ createdAt          │      └──────────────────┘
│ updatedAt          │
└────────────────────┘
```

---

*Generated for Backend Ledger project — Last updated: September 2026*
