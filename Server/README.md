# TaskEscrow — Server

A campus micro-freelance escrow platform backend built with **Node.js**, **Express.js**, **MongoDB/Mongoose**, and **Razorpay**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ES Modules) |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (HttpOnly cookies) + bcrypt |
| Payments | Razorpay |

---

## Project Structure

```
Server/
├── config/
│   └── razorpay.js          # Razorpay instance
├── controllers/
│   ├── auth.controller.js
│   ├── bid.controller.js
│   ├── delivery.controller.js
│   ├── payment.controller.js
│   ├── task.controller.js
│   └── wallet.controller.js
├── middlewares/
│   ├── auth.middleware.js   # JWT verification
│   └── role.middleware.js   # requireClient / requireFreelancer
├── models/
│   ├── bid.model.js
│   ├── task.model.js
│   ├── transaction.model.js
│   └── user.model.js
├── routes/
│   ├── auth.routes.js
│   ├── bid.routes.js
│   ├── delivery.routes.js
│   ├── payment.routes.js
│   ├── task.routes.js
│   └── wallet.routes.js
├── utils/
│   └── generateToken.js     # JWT generation + cookie setter
├── .env.example
├── index.js                 # Entry point
└── package.json
```

---

## Setup Instructions

### 1. Prerequisites

- Node.js ≥ 18
- MongoDB running locally or a MongoDB Atlas URI
- A Razorpay test account ([https://razorpay.com](https://razorpay.com))

### 2. Install dependencies

```bash
cd Server
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```env
PORT=5001
MONGO_URI=mongodb://127.0.0.1:27017/taskescrow
JWT_SECRET=taskescrow_super_secret_jwt_key_2026
RAZORPAY_KEY_ID=rzp_test_XXXXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXXXXXX
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 4. Run the server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/register` | ✗ | — | Register a new user |
| POST | `/login` | ✗ | — | Login and receive HttpOnly cookie |
| GET | `/me` | ✓ | any | Get current user profile |
| POST | `/logout` | ✓ | any | Clear auth cookie |

### Tasks — `/api/tasks`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/` | ✓ | client | Create a new task |
| GET | `/` | ✓ | any | List all OPEN tasks |
| GET | `/my` | ✓ | any | List tasks owned/assigned to current user |
| GET | `/:id` | ✓ | any | Get task details |
| DELETE | `/:id` | ✓ | client | Cancel an OPEN task |

### Bids — `/api/bids`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/:taskId` | ✓ | freelancer | Place a bid |
| GET | `/:taskId` | ✓ | client | View bids on a task |
| PATCH | `/:bidId/accept` | ✓ | client | Accept bid (creates Razorpay order) |
| PATCH | `/:bidId/reject` | ✓ | client | Reject a bid |

### Payments — `/api/payments`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/verify` | ✓ | client | Verify Razorpay signature & lock funds |

### Delivery — `/api/delivery`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/:taskId/submit` | ✓ | freelancer | Submit deliverable |
| POST | `/:taskId/approve` | ✓ | client | Approve delivery & release payment |
| POST | `/:taskId/revision` | ✓ | client | Request revision |
| POST | `/:taskId/refund` | ✓ | client | Refund after missed deadline |

### Wallet — `/api/wallet`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | ✓ | any | Get balance + transaction history |
| POST | `/withdraw` | ✓ | any | Mock withdrawal from wallet |

---

## Task Status Flow

```
OPEN → (payment verified) → IN_PROGRESS → (freelancer submits) → UNDER_REVIEW
     ↓                                         ↓                        ↓
 CANCELLED                               (client revises)           COMPLETED
                                         IN_PROGRESS ←               REFUNDED (after deadline)
```

---

## Escrow Payment Flow

1. **Client creates task** → status `OPEN`
2. **Freelancer places bid**
3. **Client accepts bid** → Razorpay order created (funds NOT locked yet)
4. **Client completes Razorpay payment** on frontend
5. **Frontend calls** `POST /api/payments/verify` with signature
6. **Server verifies HMAC-SHA256 signature** → locks funds → status `IN_PROGRESS`
7. **Freelancer submits deliverable** → status `UNDER_REVIEW`
8. **Client approves** → funds credited to freelancer wallet → status `COMPLETED`
   - OR **Client requests revision** → status back to `IN_PROGRESS`
   - OR **Deadline passes** → client claims refund → funds back to client wallet → status `REFUNDED`
