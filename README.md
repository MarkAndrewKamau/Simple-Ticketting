# The Family Connection Experience — Ticketing

Landing page + ticket checkout for Grace Height Heritage Academy's family day.
Pricing is **KSh 1,000 per parent** and **KSh 500 per child**, with a limited
**KSh 2,500 whole-family** offer running until 12 August. Paid by M-Pesa through
Paystack.

```
frontend/   Vite + React landing page and checkout form  → Render Static Site
backend/    Express + Paystack API                       → Render Web Service
            MongoDB Atlas order store
```

## Quick start

```bash
# terminal 1
cd backend && npm install && cp .env.example .env   # add your Paystack SECRET key
npm run dev                                          # http://localhost:4000

# terminal 2
cd frontend && npm install && cp .env.example .env
npm run dev                                          # http://localhost:5173
```

Backend details, route table, and the go-live checklist are in
[backend/README.md](backend/README.md).

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

The school crest is `frontend/public/logo.png` — the supplied artwork with its
cream background knocked out, so it sits cleanly on both the cream and navy
sections. Replace that one file to update the nav, hero, footer and favicon.

## QR code

```bash
cd frontend
npm run qr                          # uses the deployed URL
npm run qr -- https://your-url.com  # or pass one
```

Writes `public/qr-book.png` (1200px, for print and WhatsApp) and
`public/qr-book.svg` (vector, for any poster size). It encodes the `#book`
anchor, so scanning opens the payment form directly rather than the top of the
page.

Generated at error-correction level H with a full quiet zone — it still decodes
at 120px wide. Do not crop the white border or print it inverted; both are the
usual ways a QR stops scanning.

## Payment flow

1. Parent picks a ticket type (family or per-person), then fills in name,
   M-Pesa number, optional email, and how many parents and children.
2. Frontend `POST /api/checkout` with
   `{ name, email, phone, ticketType, parents, children }` — **no amount**; the
   backend prices it so the total can't be tampered with from the browser, and
   re-checks the family offer deadline against its own clock.
3. Backend creates a Paystack mobile-money charge → parent gets the STK push and
   just enters their PIN.
4. Frontend polls `GET /api/orders/:reference` until `paid` / `failed`, while the
   Paystack webhook provides the authoritative confirmation server-side.

Live secret keys belong in `backend/.env` only — never in the frontend bundle,
where anything prefixed `VITE_` is public.

Run `cd backend && npm test` to exercise the whole flow (including webhook
signature forgery, underpayment, and rate limiting) against a mock Paystack and
a throwaway MongoDB — no real money, no real phone, no touching Atlas.

## Deploying

[render.yaml](render.yaml) is a Blueprint that creates both services and wires
the API URL and the allowed origin between them automatically.

> Render Dashboard → New → Blueprint → select this repo

It prompts for the two secrets it will not store in git (`PAYSTACK_SECRET_KEY`,
`MONGODB_URI`) and generates `ADMIN_TOKEN` for you.

### MongoDB Atlas

1. Create a free M0 cluster — pick a region near Kenya (AWS `eu-central-1`
   Frankfurt or `eu-west-1` Ireland).
2. Database Access → add a user with **Read and write to any database**.
3. Network Access → **allow `0.0.0.0/0`**. Render's free and Starter instances
   have no fixed outbound IP, so there is nothing narrower to allow-list. The
   database user's password is therefore the only thing protecting the cluster —
   make it long and random.
4. Connect → Drivers → copy the `mongodb+srv://…` string into `MONGODB_URI`, and
   **URL-encode the password** if it contains `@ : / ? # %`.

### After the first deploy

- Set the Paystack webhook to
  `https://<your-api>.onrender.com/api/paystack/webhook`.
- `VITE_API_URL` is baked into the frontend **at build time** — changing it needs
  a rebuild of the static site, not just a restart.
- Free Render instances sleep after 15 minutes idle and take ~50s to wake, with
  a parent waiting on the payment button. Use a paid instance for the event or
  keep `/api/health` pinged.
