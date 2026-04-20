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
```

### Admin reset-email setup
Use `/admin/reset-password` and provide the admin username and email at least once so the system knows where to send rotation/reset emails.
