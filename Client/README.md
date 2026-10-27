# TaskEscrow — Client Frontend

The frontend client for **TaskEscrow**, built with **React 18**, **Vite**, **React Router DOM v6**, and **Axios**.

---

## Features

- **Role-Based Dynamic Views:** Adapts navigation and permissions based on whether the logged-in user is a **Client** or a **Freelancer**.
- **Context-Driven State Management:** Global session handling via `AuthContext.jsx` with automatic session checking (`/api/auth/me`).
- **Dynamic Routing:** Protected routes with authentication checks (`ProtectedRoute.jsx`).
- **Razorpay Checkout Integration:** Dynamic script loading (`loadRazorpayScript`) and payment handling with transaction feedback.
- **Single Page Application Rewrites:** `vercel.json` configured for seamless client-side routing on production deployments.

---

## Directory Structure

```text
src/
├── components/
│   ├── Navbar.jsx         # Global header with dynamic role links and logout
│   └── ProtectedRoute.jsx # Route guard redirecting unauthorized users
├── context/
│   └── AuthContext.jsx    # Authentication provider & user session state
├── pages/
│   ├── CreateTask.jsx     # Task posting form (Client only)
│   ├── Dashboard.jsx      # Primary dashboard tailored to user role
│   ├── Login.jsx          # Login view
│   ├── Register.jsx       # Registration view with role selection
│   ├── TaskDetail.jsx     # Task detail view, Razorpay modal, and delivery controls
│   ├── TaskList.jsx       # Public marketplace feed for open tasks (Freelancer only)
│   └── Wallet.jsx         # Virtual wallet balance, withdrawal form, and audit table
├── services/
│   └── api.js             # Pre-configured Axios instance with withCredentials: true
├── App.css                # Pure responsive CSS styles and status badges
├── App.jsx                # Route tree definition
└── main.jsx               # React DOM entry point
```

---

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   copy .env.example .env
   ```
   Set `VITE_API_URL=http://localhost:5001/api`.

3. Start development server:
   ```bash
   npm run dev
   ```
   The client will be accessible at `http://localhost:5173`.

4. Build for production:
   ```bash
   npm run build
   ```
