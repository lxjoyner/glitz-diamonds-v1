This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Structure
npm version: 11.2.0, node version: 22.10.0



## Admin password reset and 60-day email rotation

This project now supports admin password-reset links and automatic enforcement of password rotation.

### What happens
- Admin users can request a reset link from `/admin/reset-password`.
- Reset links are single-use, tokenized, and expire in 60 minutes.
- On login, if the admin password age is 60+ days (configurable), login is blocked and a reset email is sent automatically.

### Required environment variables
```bash
APP_BASE_URL=http://localhost:3000
PASSWORD_RESET_INTERVAL_DAYS=60

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
PASSWORD_RESET_FROM_EMAIL=no-reply@example.com

# Optional Hostinger aliases also supported by the app:
# EMAIL_USERW=women@glitzofdiamonds.com
# EMAIL_PASSW=your-hostinger-password
# CONTACT_TO_WEMAIL=women@glitzofdiamonds.com
# POLL_RESPONSE_TO_EMAIL=women@glitzofdiamonds.com
```

### Local network testing (same Wi‑Fi)
If you want poll links and other emailed URLs to work from phones/devices on the same Wi‑Fi, set:

```bash
APP_BASE_URL=http://192.168.68.70:3000
```

Then start dev with host binding so other devices can reach your machine:

```bash
npm run dev -- --hostname 0.0.0.0 --port 3000
```

The poll response API already stores votes in the database. If `POLL_RESPONSE_TO_EMAIL` (or fallback `CONTACT_TO_WEMAIL`) is set, each submitted email vote also sends a notification to that inbox.

### Admin reset-email setup
Use `/admin/reset-password` and provide the admin username and email at least once so the system knows where to send rotation/reset emails.

## Stripe donation checkout

A hosted Stripe Checkout flow is now available at `/donate`.

### Required environment variables
```bash
STRIPE_SECRET_KEY=sk_live_or_test_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### Where to keep your Stripe secret key
- **Do not store `STRIPE_SECRET_KEY` in your database.**
- Keep it in server-side environment variables only (`.env.local` for local dev, hosting provider secret manager in production).
- Never prefix it with `NEXT_PUBLIC_` and never expose it in client-side code.

### Common local testing issues
- `Missing STRIPE_SECRET_KEY` usually means one of these:
  - `.env.local` is not in the **project root** (same level as `package.json`).
  - Dev server was not restarted after adding/changing env vars.
  - Typo in the key name (must be exactly `STRIPE_SECRET_KEY`).
  - Value is wrapped incorrectly or empty (e.g. `STRIPE_SECRET_KEY=""`).

Example local file:
```bash
# .env.local (do not commit this file)
STRIPE_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Optional environment variables
```bash
# Optional: use a fixed Stripe Price ID instead of dynamic amount pricing
STRIPE_DONATION_PRICE_ID=price_12345
```

### How it works
- The donation form sends amount + optional donor details to `POST /api/donations/checkout`.
- The API route creates a Stripe Checkout Session and returns a hosted checkout URL.
- Donors are redirected to Stripe and then returned to `/donate?status=success` or `/donate?status=cancelled`.

> Note: If you set `STRIPE_DONATION_PRICE_ID`, Stripe will charge that configured price. The selected amount is still captured in metadata as `requestedAmount`.

## Deploying to Hostinger (Next.js checklist)

If you are deploying to a Hostinger Node.js/VPS setup (not static hosting), review this before going live:

### 1) Build/start model
- This app is configured with `output: "standalone"` in `next.config.ts` to make production deployment easier.
- Use the standard production flow:

```bash
npm ci
npm run build
npm run start
```

### 2) Production environment variables
Set these in Hostinger (do not commit secrets):

```bash
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# DB
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...

# Email / password reset
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...
PASSWORD_RESET_FROM_EMAIL=...
PASSWORD_RESET_INTERVAL_DAYS=60

# Stripe (if donations enabled)
STRIPE_SECRET_KEY=...
STRIPE_DONATION_PRICE_ID=... # optional

# Auth
JWT_SECRET=use-a-long-random-secret
```

### 3) Reverse proxy and domain
- Point your domain to the Hostinger server.
- Terminate SSL at your proxy and forward traffic to your Node app port.
- Ensure forwarded headers are preserved so generated absolute URLs use HTTPS.

### 4) Runtime requirements
- Use a modern Node.js LTS/runtime compatible with your Next.js version.
- Keep `package-lock.json` in repo and install with `npm ci` for reproducible builds.

### 5) Post-deploy smoke checks
- Open `/`, `/admin/login`, and `/donate` (if enabled).
- Submit contact/poll forms and verify DB writes + email delivery.
- Trigger password-reset flow and confirm reset link uses your production domain.
- Verify Stripe checkout redirects back to `https://your-domain.com/donate`.

### 6) Optional hardening
- Run app behind a process manager (PM2/systemd) with restart on failure.
- Restrict DB user privileges to only what the app needs.
- Rotate SMTP/JWT/Stripe credentials periodically.
