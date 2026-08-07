# Backend — coming next

Express + Paystack service for the Family Connection Experience tickets.

Planned surface (the frontend already calls these):

| Method | Route                     | Purpose                                                        |
| ------ | ------------------------- | -------------------------------------------------------------- |
| POST   | `/api/checkout`           | Create an order, charge KSh 1,500 × qty via Paystack mobile money (M-Pesa STK push) |
| GET    | `/api/orders/:reference`  | Poll order status: `pending` \| `paid` \| `failed` \| `abandoned` |
| POST   | `/api/paystack/webhook`   | Paystack `charge.success` webhook — the authoritative confirmation |

Key rules already assumed by the frontend:

- The **amount is computed server-side** from a fixed KSh 1,500 price. The client
  only sends `quantity`; money values are never trusted from the browser.
- Secret keys live in `backend/.env` (`PAYSTACK_SECRET_KEY`) and never reach the
  frontend bundle.
