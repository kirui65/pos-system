# POS System

Foundation for a multi-business, multi-shop POS. The current release includes an Express/PostgreSQL API, authentication, product and inventory endpoints, plus a responsive React dashboard preview.

## Local setup

1. Create a local database: `createdb pos_system` (or create it through `psql`).
2. Copy `backend/.env.example` to `backend/.env`, then set a valid local `DATABASE_URL` and long JWT secrets.
3. From the repository root run `npm install`.
4. Run `npm --workspace backend run migrate:up`.
5. Run `npm --workspace backend run seed`.
6. Start the API with `npm --workspace backend run dev`, then check `curl http://localhost:3000/health`.
7. In another terminal, start the dashboard with `npm --workspace dashboard run dev`. Open `http://localhost:5173` in your browser.

The demo seed outputs these credentials: owner/manager password `DemoPass123!`, cashier PIN `1234`, and super-admin password `DemoPass123!`. It refuses in production and skips an existing demo business.

## Authentication API

All authenticated requests use `Authorization: Bearer <accessToken>`. `POST /auth/login` accepts `{ "email", "password", "shopId", "deviceId?" }`; `POST /auth/pin-login` accepts `{ "userId", "pin", "shopId", "deviceId?" }`. Both return access and refresh tokens plus the selected shop context. `POST /auth/refresh` accepts `{ "refreshToken" }` and rotates it; `POST /auth/logout` revokes the supplied refresh token; `GET /auth/me` returns the active authenticated context.

## Products and inventory API

`GET /products` lists products in the authenticated business. Owners and managers can add products with `POST /products` and update them with `PATCH /products/:id`.

`GET /inventory` returns stock levels for the shop selected in the access token. `GET /inventory/low-stock` returns tracked products whose quantity is at or below their reorder level. The dashboard uses this endpoint when `pos_access_token` is available in browser local storage.

## Sales and checkout API

`POST /sales` registers checkout transactions atomically. It accepts `{ customerId?, shiftId?, items: [{ productId, quantity, unitPriceMinor?, discountMinor? }], payments: [{ method: 'cash' | 'mobile_money', amountMinor, reference? }], discountMinor?, taxMinor? }`. It validates line items, deducts inventory from `stock_levels`, logs append-only audit entries in `stock_movements`, handles customer store credit if partially paid, and returns receipt data. `GET /sales` lists sales history with pagination, and `GET /sales/:id` returns itemized transaction and tender breakdowns.

## Shops and customers API

`GET /shops` returns accessible shops for the authenticated user, and `POST /auth/switch-shop` switches the user's active shop context. `GET /auth/cashiers` lists active cashiers for quick terminal login. `GET /customers` searches registered customers, `POST /customers` creates customer records with phone contacts and credit limits, and `GET /customers/:id` retrieves customer credit balances.

## Dashboard

The React dashboard now includes:
1. **Interactive Point of Sale (POS)**: Full-featured register with product search, category filters, live cart, quantity toggles, and customer assignment.
2. **Checkout & Tender Settlement**: Cash payment with tender change calculator, quick denomination chips, and M-Pesa mobile money reference entry.
3. **Receipt Generation**: Printable itemized retail receipt modal with breakdown of totals, taxes, and change.
4. **Overview & Analytics**: Live KES sales metrics, transaction count, average basket size, 7-day trend chart, M-Pesa/Cash ratio donut, and low-stock alerts.
5. **Sales History**: Audit log of past transactions with searchable receipt numbers and detail viewers.
6. **Product & Customer Management**: View catalogues, check store balances, and add new products and customer profiles.
7. **Authentication & Multi-Shop Support**: Quick demo credential presets, cashier PIN login, and live shop switching.

Run the migration reversibility check with `npm --workspace backend run migrate:up && npm --workspace backend run migrate:down && npm --workspace backend run migrate:up`.

## Render deployment

Push this repository to GitHub, create a Render Blueprint from `render.yaml`, and set the backend `CORS_ORIGINS` to the dashboard origin. Set the dashboard `VITE_API_BASE_URL` to the public API URL (for example, `https://pos-system-api.onrender.com`) so its browser requests target the deployed service. Render provisions the PostgreSQL service, supplies its connection string, and generates both JWT secrets. The service runs migrations before starting the compiled API. Do not set `DATABASE_SSL=false` in Render.
