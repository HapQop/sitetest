# Authentication setup

The frontend already sends registration, login, verification, and password-recovery requests to `/api/auth/*`. The Vercel function in `api/auth/[action].js` provides those endpoints.

After adding this function, redeploy the project. A 404 response means the deployment was made before the `api` folder was added; a 503 response means the function is deployed but one or more environment variables below are missing.

Before deploying, add these Vercel environment variables for Production (and Preview if needed):

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `RESEND_API_KEY`
- `AUTH_FROM_EMAIL`
- `ADMIN_EMAILS` (set to `1mmx1mmxxx@gmail.com` for the requested admin account)

Create a Vercel KV/Upstash Redis store to obtain the first two values. Create a Resend account, verify the sending domain, create an API key, and set `AUTH_FROM_EMAIL` to an address on that verified domain. Never commit real values to the repository.

The API stores password hashes, short-lived verification challenges, and seven-day sessions. It sends a six-digit code for registration and login, and a recovery code for password resets.

## Admin panel

Open `/admin.html` after signing in with an account whose verified email is listed in `ADMIN_EMAILS`. The panel can update each product plan's USD price, stock count, and availability. Changes are stored in the same KV database and are applied to the public catalog on the next page load.

The admin endpoint checks the HttpOnly session cookie, the verified account email, and the request origin before accepting updates. Keep `ADMIN_EMAILS` restricted to owner-controlled addresses and never put KV or email provider tokens in client-side files.
