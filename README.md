# TripShare India — Full-Stack Project

TripShare India helps users find Indian events, book tickets, find travel companions attending the same event, save favourite events, and split travel expenses (hotel, food, transport).

Stack: **HTML/CSS/JS** frontend + **Node.js / Express** backend + **MongoDB (Mongoose)** database + **JWT + bcrypt** auth + **Multer** file uploads.

---

## 1. Project structure

```
TripShare-India/
  client/
    index.html
    style.css
    script.js
  server/
    server.js
    package.json
    .env.example
    config/
      db.js
      upload.js
    models/
      User.js
      Event.js
      Booking.js
      Expense.js
      ContactRequest.js
    middleware/
      authMiddleware.js
      adminMiddleware.js
    routes/
      authRoutes.js
      eventRoutes.js
      bookingRoutes.js
      expenseRoutes.js
      userRoutes.js
      contactRoutes.js
    controllers/
      authController.js
      eventController.js
      bookingController.js
      expenseController.js
      userController.js
      contactController.js
    uploads/            (uploaded images are stored here)
    seed/
      seed.js
  README.md
```

---

## 2. Install MongoDB (pick ONE option)

**Option A — MongoDB Atlas (cloud, no local install, recommended for beginners)**
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a free cluster (M0).
3. Under "Database Access", create a database user with a username/password.
4. Under "Network Access", add your current IP (or `0.0.0.0/0` for testing).
5. Click "Connect" → "Drivers" → copy the connection string. It looks like:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tripshare_india`

**Option B — Local MongoDB**
1. Download and install MongoDB Community Server: https://www.mongodb.com/try/download/community
2. Start the MongoDB service (installer sets this up as a background service on Windows/macOS; on Linux run `sudo systemctl start mongod`).
3. Your local connection string will be: `mongodb://127.0.0.1:27017/tripshare_india`

---

## 3. Backend setup

```bash
cd TripShare-India/server
npm install
```

Create your `.env` file:

```bash
cp .env.example .env
```

Open `.env` and fill in real values:

```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/tripshare_india    # or your Atlas string
JWT_SECRET=some_long_random_string_here
JWT_EXPIRES_IN=7d
ADMIN_NAME=Admin User
ADMIN_EMAIL=admin@tripshare.in
ADMIN_PASSWORD=Admin@12345
ADMIN_PHONE=9999999999
ADMIN_CITY=Delhi
CLIENT_ORIGIN=http://127.0.0.1:5500
```

> `CLIENT_ORIGIN` should match whatever URL VS Code Live Server opens your `client/index.html` on (shown in the bottom-right of VS Code, usually `http://127.0.0.1:5500`).

Seed the database with an admin account and 12 sample events:

```bash
npm run seed
```

You should see output like:
```
Admin created: admin@tripshare.in / Admin@12345
12 sample events inserted.
Seed complete.
```

Start the backend server:

```bash
npm run dev      # uses nodemon, auto-restarts on file changes
# or
npm start        # plain node
```

You should see: `TripShare India API running on http://localhost:5000`

Test it's alive by opening `http://localhost:5000/api/health` in your browser — you should see a JSON success message.

---

## 4. Frontend setup (VS Code Live Server)

1. Open the `TripShare-India` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `client/index.html` → **"Open with Live Server"**.
4. The site opens at something like `http://127.0.0.1:5500/client/index.html`.

The frontend calls the backend at `http://localhost:5000/api` (see the `API_BASE` constant at the top of `client/script.js`) — make sure the backend (step 3) is running at the same time.

If Live Server opens on a different port, update `CLIENT_ORIGIN` in `server/.env` to match, then restart the backend.

---

## 5. Logging in as admin

Use the seeded admin account to access the Admin Dashboard tab in the navbar:
- Email: whatever you set as `ADMIN_EMAIL` (default `admin@tripshare.in`)
- Password: whatever you set as `ADMIN_PASSWORD` (default `Admin@12345`)

From there you can add/edit/delete events (with image upload), and view all bookings and all users.

---

## 6. Notes on demo behaviour

- **Forgot password**: since no email service (like Nodemailer + SendGrid) is configured, the reset token is returned directly in the API response and shown on-screen instead of being emailed. To go to production, connect an email provider in `authController.js` (`forgotPassword` function) and stop returning the token in the JSON response.
- **JWT in localStorage**: the token is stored in the browser's `localStorage` only to keep the user logged in after a refresh — it is not used as a database. All real data (users, events, bookings, favourites, expenses, contact requests) lives in MongoDB.
- **Image uploads**: admins can either paste an Unsplash/any image URL, or upload a file (stored in `server/uploads/`, served at `http://localhost:5000/uploads/<filename>`).

---

## 7. API endpoint reference

Base URL: `http://localhost:5000/api`

Auth header format for protected routes: `Authorization: Bearer <jwt_token>`

### Auth (`/api/auth`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/signup` | No | `{fullName, email, phone, city, password, confirmPassword}` | `{success, token, user}` |
| POST | `/login` | No | `{email, password}` | `{success, token, user}` |
| GET | `/me` | Yes | — | `{success, user}` |
| POST | `/forgot-password` | No | `{email}` | `{success, resetToken}` (demo mode) |
| POST | `/reset-password` | No | `{email, resetToken, newPassword}` | `{success, message}` |

### Events (`/api/events`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/?search=&city=&category=&date=&sort=` | No | — | `{success, count, events[]}` |
| GET | `/:id` | No | — | `{success, event}` |
| POST | `/` | Admin | multipart or JSON: `{title, description, city, venue, date, time, category, price, totalSeats, rating, organiser, tags, image}` | `{success, event}` |
| PUT | `/:id` | Admin | same as above (partial) | `{success, event}` |
| DELETE | `/:id` | Admin | — | `{success, message}` |

### Bookings (`/api/bookings`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/` | Yes | `{eventId, quantity}` | `{success, booking}` |
| GET | `/my` | Yes | — | `{success, bookings[]}` |
| PUT | `/:id/cancel` | Yes | — | `{success, booking}` |
| GET | `/` | Admin | — | `{success, bookings[]}` (all users) |

### Expenses (`/api/expenses`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/` | Yes | `{hotel, food, transport, other, people, note}` | `{success, expense}` (includes `total`, `perPerson`) |
| GET | `/my` | Yes | — | `{success, expenses[]}` |
| DELETE | `/:id` | Yes | — | `{success, message}` |

### Users (`/api/users`)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| PUT | `/profile` | Yes | multipart or JSON: `{fullName, phone, city, bio, profileImage}` | `{success, user}` |
| POST | `/favourites/:eventId` | Yes | — | `{success, added, favourites}` (toggles) |
| GET | `/favourites` | Yes | — | `{success, favourites[]}` |
| GET | `/match/:eventId` | Yes | — | `{success, matches[]}` (other users who booked the same event) |
| GET | `/` | Admin | — | `{success, users[]}` |

### Trips — Find Travel Buddy (`/api/trips`)

Lets any user post a route ("Chandigarh → Manali on 15 Aug") so **other users they don't already know** can find them and connect — independent of any event booking (though a trip can optionally reference an event).

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/` | Yes | `{fromCity, toCity, travelDate, note, eventId?}` | `{success, trip}` |
| GET | `/my` | Yes | — | `{success, trips[]}` |
| GET | `/matches?fromCity=&toCity=&date=` | Yes | — | `{success, trips[]}` (other users' trips on the same route, within ±2 days of date) |
| DELETE | `/:id` | Yes | — | `{success, message}` |

### Contact / Connect (`/api/contact`)

Works for both event-based matches and trip-based matches — pass either `eventId` or `tripId`.

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/` | Yes | `{toUserId, eventId?, tripId?, message}` | `{success, request}` |
| GET | `/my` | Yes | — | `{success, requests[]}` (sent + received) |
| PUT | `/:id` | Yes | `{status: "accepted"|"rejected"}` | `{success, request}` |

---

## 8. Example request/response

**Login**
```
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@tripshare.in", "password": "Admin@12345" }
```
```json
{
  "success": true,
  "message": "Logged in successfully.",
  "token": "eyJhbGciOi...",
  "user": { "_id": "...", "fullName": "Admin User", "email": "admin@tripshare.in", "role": "admin", "...": "..." }
}
```

**Book tickets**
```
POST /api/bookings
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{ "eventId": "665f1c...", "quantity": 2 }
```
```json
{
  "success": true,
  "message": "Booking confirmed!",
  "booking": { "_id": "...", "quantity": 2, "totalAmount": 2998, "status": "confirmed" }
}
```

---

## 9. Troubleshooting

- **"MongoDB connection failed"** → check `MONGO_URI` in `.env`, and that MongoDB is running (local) or your Atlas IP allowlist includes your IP.
- **CORS error in browser console** → make sure `CLIENT_ORIGIN` in `.env` matches the URL Live Server actually opened, then restart `npm run dev`.
- **Images not loading for uploaded events** → confirm the backend is running on port 5000; uploaded images are served from `http://localhost:5000/uploads/...`.
- **"Admin access only"** → log in with the seeded admin account, or promote a user manually in MongoDB by setting their `role` field to `"admin"`.
