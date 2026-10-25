# TaskEscrow 🔒
### Campus Micro-Freelance Platform with Payment Escrow

> **End-Term Project — MERN Stack**  
> A full-stack web application where students post tasks, freelancers bid, and payments are held in a secure escrow vault until the work is verified and approved.

---

## Problem Statement

Students regularly exchange micro-services (design work, code fixes, note summaries, etc.) but face a trust deadlock: clients fear paying before receiving work, and freelancers fear doing work before receiving payment. No existing platform (Upwork, Fiverr) serves this use-case at a campus/micro scale without high fees and complex onboarding.

## Target Users

- **Clients:** Students who need small tasks done (design, code, writing)
- **Freelancers:** Students who want to earn by completing those tasks

---

## The 5 Core Workflows

```
1. Register as Client or Freelancer → Login
        ↓
2. Client posts task → Freelancer browses and bids
        ↓
3. Client accepts bid → Razorpay escrow payment locked
        ↓
4. Freelancer submits work → Client approves or requests revision
        ↓
5. Payment releases to freelancer wallet → Freelancer withdraws
```

---

## Task Lifecycle (State Machine)

```
OPEN  ──(bid accepted + payment verified)──▶  IN_PROGRESS
                                                    │
                              ┌─────────────────────┘
                              ▼
                        UNDER_REVIEW
                         │         │
             (approved)  │         │  (revision requested)
                         ▼         ▼
                     COMPLETED  IN_PROGRESS (loop)

OPEN  ──(client cancels)──▶  CANCELLED
IN_PROGRESS/UNDER_REVIEW + deadline passed  ──▶  REFUNDED
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router DOM v6, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Auth | JWT (HttpOnly Cookies), bcrypt (10 rounds) |
| Payments | Razorpay (order creation + HMAC-SHA256 signature verification) |
| State | React Context API (AuthContext) |

---

## Project Structure

```
MERN-End_Term/
├── Server/
│   ├── config/razorpay.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── bid.controller.js
│   │   ├── delivery.controller.js
│   │   ├── payment.controller.js
│   │   ├── task.controller.js
│   │   └── wallet.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│   ├── models/
│   │   ├── user.model.js
│   │   ├── task.model.js
│   │   ├── bid.model.js
│   │   └── transaction.model.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── bid.routes.js
│   │   ├── delivery.routes.js
│   │   ├── payment.routes.js
│   │   ├── task.routes.js
│   │   └── wallet.routes.js
│   ├── utils/generateToken.js
│   ├── index.js
│   └── .env.example
└── Client/
    └── src/
        ├── context/AuthContext.jsx
        ├── components/Navbar.jsx, ProtectedRoute.jsx
        ├── pages/
        │   ├── Login.jsx, Register.jsx
        │   ├── Dashboard.jsx
        │   ├── TaskList.jsx, CreateTask.jsx, TaskDetail.jsx
        │   └── Wallet.jsx
        └── services/api.js
```

---

## Local Setup

### Prerequisites
- Node.js v18+
- MongoDB running locally on port 27017

### 1. Backend
```bash
cd Server
# Copy the env file
copy .env.example .env
# Fill in your Razorpay keys in .env
npm install
npm run dev
```
Server starts on `http://localhost:5001`

### 2. Frontend
```bash
cd Client
npm install
npm run dev
```
Client starts on `http://localhost:5173`

---

## Environment Variables

### Server `.env`
```
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/taskescrow
JWT_SECRET=your_jwt_secret_here
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### Client `.env`
```
VITE_API_URL=http://localhost:5001/api
```

> ⚠️ Never commit `.env` files to GitHub. They are in `.gitignore`.

---

## API Endpoints

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| POST | /api/auth/register | No | Any | Register user |
| POST | /api/auth/login | No | Any | Login |
| GET | /api/auth/me | Yes | Any | Get current user |
| POST | /api/auth/logout | Yes | Any | Logout |
| POST | /api/tasks | Yes | Client | Post a new task |
| GET | /api/tasks | Yes | Any | Browse OPEN tasks |
| GET | /api/tasks/my | Yes | Any | My tasks (role-aware) |
| GET | /api/tasks/:id | Yes | Any | Task detail |
| DELETE | /api/tasks/:id | Yes | Client | Cancel task (OPEN only) |
| POST | /api/bids/:taskId | Yes | Freelancer | Place a bid |
| GET | /api/bids/:taskId | Yes | Client | View bids on my task |
| PATCH | /api/bids/:bidId/accept | Yes | Client | Accept bid → creates Razorpay order |
| PATCH | /api/bids/:bidId/reject | Yes | Client | Reject bid |
| POST | /api/payments/verify | Yes | Client | HMAC-verify Razorpay signature → lock escrow |
| POST | /api/delivery/:taskId/submit | Yes | Freelancer | Submit deliverable |
| POST | /api/delivery/:taskId/approve | Yes | Client | Approve work → release payment |
| POST | /api/delivery/:taskId/revision | Yes | Client | Request revision |
| POST | /api/delivery/:taskId/refund | Yes | Client | Refund (deadline passed) |
| GET | /api/wallet | Yes | Any | Balance + transaction history |
| POST | /api/wallet/withdraw | Yes | Any | Withdraw from wallet |

---

## Security Highlights
- Passwords hashed with bcrypt (10 salt rounds) — never stored raw
- JWTs stored in `HttpOnly` cookies — inaccessible to JavaScript (`document.cookie`)
- Razorpay payment verified server-side using HMAC-SHA256 with `crypto.timingSafeEqual` (prevents timing attacks)
- Escrow funds only credited to freelancer after cryptographic payment proof
- All routes enforce ownership checks (users can only action their own tasks/orders)
- Role-based middleware prevents clients acting as freelancers and vice versa
- No secrets committed to Git

---

## Engineering Depth Checklist

- [x] JWT authentication with HttpOnly cookies
- [x] Role-based authorization (client / freelancer)
- [x] Multi-step task lifecycle state machine (6 states)
- [x] Razorpay payment escrow — order creation + signature verification
- [x] HMAC-SHA256 cryptographic payment verification with timing-safe compare
- [x] Atomic wallet crediting only after payment verification
- [x] Automatic bid rejection when another bid is accepted
- [x] Deadline-based refund eligibility engine
- [x] Transaction audit log for every money movement
- [x] Race-condition safe useEffect cleanups on all data-fetching pages
- [x] Complete loading, error, and empty states on every page
- [x] Input validation on both client and server sides
