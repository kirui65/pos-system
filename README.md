# POS System

A multi-shop point-of-sale system for small businesses. It has an Express/PostgreSQL API, a React dashboard, inventory tracking, customer credit, and support for cash and mobile-money payments.

## Stack

- Node.js and Express
- PostgreSQL
- React
- JWT authentication
- Render deployment with `render.yaml`

## Run locally

Create a local database first:

```bash
createdb pos_system
```

Install dependencies and configure the API:

```bash
npm install
cp backend/.env.example backend/.env
```

Set `DATABASE_URL` and the JWT secrets in `backend/.env`, then run the migrations and seed data:

```bash
npm --workspace backend run migrate:up
npm --workspace backend run seed
```

Start the API:

```bash
npm --workspace backend run dev
```

The API runs on `http://localhost:3000` by default. In a second terminal, start the dashboard:

```bash
npm --workspace dashboard run dev
```

Open `http://localhost:5173` in your browser.

The development seed creates demo accounts. Check the seed output for the current credentials; these credentials are disabled when the app runs in production.

## Features

- Product catalog and stock-level tracking
- Checkout with cash and mobile-money payments
- Receipt generation and sales history
- Customer profiles, credit limits, and store credit
- Multiple shops under one business
- Cashier PIN login and shop switching
- Dashboard with sales, basket-size, payment, and low-stock summaries
- Append-only stock movement and audit records

## API areas

The API includes routes for authentication, products, inventory, sales, shops, customers, and cashier access. Authenticated requests use `Authorization: Bearer <accessToken>`.

## Deployment

The repository includes `render.yaml` for deploying the API, PostgreSQL database, and dashboard on Render. Set the dashboard API URL and allowed CORS origin to match the deployed services.
