# The Family Connection Experience — Ticketing

Landing page + ticket checkout for Grace Height Heritage Academy's family day.
Tickets are a flat **KSh 1,500 per child**, paid by M-Pesa through Paystack.

```
frontend/   Vite + React landing page and checkout form
backend/    Express + Paystack API (next step)
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env      # point VITE_API_URL at the backend
npm run dev               # http://localhost:5173
npm run build             # static bundle in dist/
```

Every event detail — date, time, itinerary, price, phone number, audience —
lives in [frontend/src/data/event.js](frontend/src/data/event.js). Change it
there and it updates everywhere on the page.

The school crest is currently a stylised SVG stand-in in
[frontend/src/components/Crest.jsx](frontend/src/components/Crest.jsx). Drop the
real logo into `frontend/public/` and render an `<img>` instead.

## Payment flow

1. Parent fills in name, M-Pesa number, optional email, and number of children.
2. Frontend `POST /api/checkout` with `{ name, email, phone, quantity }` —
   **no amount**; the backend derives it from the fixed price so the total can't
   be tampered with from the browser.
3. Backend creates a Paystack mobile-money charge → parent gets the STK push and
   just enters their PIN.
4. Frontend polls `GET /api/orders/:reference` until `paid` / `failed`, while the
   Paystack webhook provides the authoritative confirmation server-side.

Live secret keys belong in `backend/.env` only — never in the frontend bundle,
where anything prefixed `VITE_` is public.
