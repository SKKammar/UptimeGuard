# UptimeGuard

UptimeGuard is a lightweight, zero-cost uptime monitoring application built with Next.js 15 (App Router), React 19, Supabase, Tailwind, and Recharts. 

It allows users to configure monitors that regularly ping external URLs, track their response times, and record uptime/downtime events.

## Architecture

This project uses a "serverless cron" architecture to minimize hosting costs while remaining fully functional on platforms like Vercel (Hobby plan).

- **Next.js API Route**: The core logic lives in a single `/api/cron` route. This route fetches due monitors from Supabase, executes the HTTP requests, records the results (`pings`), and sends Discord alerts for downtime/recovery.
- **Supabase**: Serves as the PostgreSQL database (storing `monitors`, `pings`, `user_settings`, `alerts`) and handles authentication via Supabase Auth.
- **External Scheduler**: Vercel Hobby limits built-in crons to once per day. To achieve high-frequency monitoring (e.g., every 1-5 minutes), we rely on an external trigger like GitHub Actions (see `.github/workflows/ping-cron.yml`) or a free service like cron-job.org to securely call the `/api/cron` endpoint.

## Setup Instructions

1. Clone the repository and install dependencies: `npm install`
2. Create a Supabase project and apply the migrations in `supabase/migrations/` using the SQL Editor.
3. Copy `.env.example` to `.env.local` and populate the required keys:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings.
   - `SUPABASE_SERVICE_ROLE_KEY` for the backend to bypass RLS during cron execution.
   - `CRON_SECRET`: Generate a strong, random 32+ character string.
4. Run the development server: `npm run dev`

### Production Deployment

1. Deploy the app to Vercel.
2. In Vercel's Environment Variables dashboard, set all keys from `.env.local`, including your newly generated `CRON_SECRET`.
3. To automate the pings, either:
   - Add `CRON_SECRET` as a GitHub repository secret and enable the GitHub Actions workflow included in this repo.
   - Or, sign up for [cron-job.org](https://cron-job.org), configure a 1-minute job pointing to `https://your-app-domain.com/api/cron`, and include the header `Authorization: Bearer <YOUR_CRON_SECRET>`.

## Known Limitations

- **SSRF Tradeoff**: Monitor URLs are fetched server-side from the Vercel edge/lambda with no allow-list. This is a conscious tradeoff inherent to building a functional uptime monitor. Users should be aware that the system can technically be used to ping internal or private endpoints if it's deployed in a VPC (though typically not an issue on public Vercel).
- **Tests**: A comprehensive test suite has not been added yet. This is a planned follow-up item.
- **GitHub Actions Accuracy**: If you rely on the provided GitHub Actions workflow for your cron, keep in mind that GitHub's scheduler is approximate and heavily loaded; a 5-minute interval might stretch longer depending on queue times. For stricter accuracy on the free tier, a service like cron-job.org is recommended.
