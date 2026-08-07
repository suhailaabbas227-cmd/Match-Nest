# MatchNest

A Halal Muslim **Dating & Marriage** web app — one platform, two modes
(**Halal Dating** and **Nikah / Marriage**), built from the project proposal.

- **Frontend:** React + Vite + React Router
- **Backend:** Node + Express + Socket.io (real-time chat) + JWT auth
- **Storage:** JSON file store (`server/data/db.json`) — drop-in replaceable with MongoDB
- **Photos:** local uploads in `server/uploads` — drop-in replaceable with Cloudinary

> The proposal specifies MongoDB + Cloudinary. To let the app run with **zero external
> setup**, those are swapped for a local JSON store and local file uploads. The code is
> structured (`server/src/db.js`, the `/profile/photo` route) so the swap is isolated.

## Run it (two terminals)

```powershell
# Terminal 1 — API
cd server
npm install
npm run seed     # creates demo users + an admin (first run only)
npm start        # http://localhost:4000

# Terminal 2 — Web app
cd client
npm install
npm run dev      # http://localhost:5173
```

Open **http://localhost:5173**.

## Demo logins (after `npm run seed`)

| Account | Email | Password |
|--------|-------|----------|
| Admin | `admin@matchnest.app` | `admin123` |
| Dating user | `aisha@example.com` | `password123` |
| Dating user | `yusuf@example.com` | `password123` |
| Marriage user | `fatima@example.com` | `password123` |
| Marriage user | `bilal@example.com` | `password123` |

## The user journey (proposal Section 03)

1. **Sign up** — name, email/phone, password, DOB, gender, location → 2. **Verify** via
   OTP code (shown on screen in demo mode) → 3. **Pick a mode** (Dating or Marriage) →
   4. **Build a profile** (short for Dating, full 5-section biodata for Marriage, photos) →
   5. **Browse & connect** with filters → accept = **match** → 6. **Chat** in real time
   (Marriage mode adds an optional **Chaperone** to bring family into the conversation).

## Feature map (proposal Section 05)

| Feature | Dating | Marriage |
|---|:--:|:--:|
| Profile with photos | ✓ | ✓ |
| Filter by location, sect, age, religiosity | ✓ | ✓ |
| Send & accept connection requests | ✓ | ✓ |
| In-app real-time chat | ✓ | ✓ |
| Report & block users | ✓ | ✓ |
| Full biodata / family info | — | ✓ |
| Wali (guardian) contact field | — | ✓ |
| Chaperone mode (family in chat) | — | ✓ |
| Photo privacy — blur until matched | — | ✓ |
| Marriage expectations + Mahr field | — | ✓ |

Switch modes any time from **Settings** — existing data carries over.

## Upgrading to the full proposed stack

- **MongoDB:** replace the `collection()` helpers in `server/src/db.js` with Mongoose
  models; the route code already speaks in `findOne` / `insert` / `update`.
- **Cloudinary:** swap the multer disk storage in `server/src/routes/profile.js` for the
  Cloudinary SDK and store the returned URL.
- **Real email/SMS OTP:** the OTP is generated in `server/src/routes/auth.js` and logged /
  returned as `devOtp`. Wire it to a provider (SendGrid, Twilio) and stop returning it.
