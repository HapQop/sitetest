# Authentication setup

The frontend already sends registration, login, verification, and password-recovery requests to `/api/auth/*`. The Vercel function in `api/auth/[action].js` provides those endpoints.

After adding this function, redeploy the project. A 404 response means the deployment was made before the `api` folder was added; a 503 response means the function is deployed but one or more environment variables below are missing.

Before deploying, add these Vercel environment variables for Production (and Preview if needed):

- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `RESEND_API_KEY`
- `AUTH_FROM_EMAIL`
- `ADMIN_EMAILS` (optional comma-separated additional administrator addresses)

Create a Vercel KV/Upstash Redis store to obtain the first two values. Create a Resend account, verify the sending domain, create an API key, and set `AUTH_FROM_EMAIL` to an address on that verified domain. Never commit real values to the repository.

## Resend delivery failure

If Vercel logs `Email provider rejected the message`, the API is running but Resend has rejected `AUTH_FROM_EMAIL`. In Resend, add and verify `cheatblox.xyz` under **Domains**, then publish every DNS record Resend provides. After the domain is verified, set the Vercel `AUTH_FROM_EMAIL` variable to a matching sender, for example `CheatBlox <noreply@cheatblox.xyz>`, for the Production environment (and Preview if used), then redeploy. A Resend test sender cannot deliver verification codes to arbitrary customers.

The API returns HTTP `503` for delivery rejection and deletes the unsent verification challenge, so a customer can retry after the sender is corrected.

The API stores password hashes, short-lived verification challenges, and seven-day sessions. It sends a six-digit code for registration and login, and a recovery code for password resets. `POST /api/auth/login-code` accepts `{ "email": "..." }` and returns a `challengeId` for passwordless sign-in. Submit that ID and the emailed six-digit code to `POST /api/auth/verify`; a successful response sets the normal session cookie. This route only sends codes to existing accounts, gives the same response for unknown addresses, and limits each address to one code per minute. Codes expire after ten minutes and allow five attempts.

Registration can also save one optional Discord or Telegram username in the user record as `socialContact` with `status: "pending"`. This is a contact preference, not a verified account link. After the bots are available, verify ownership through the chosen bot and store the platform user ID before treating the account as connected. Existing email-only registrations continue to work.

## Admin panel

After registration and email verification, `1mmx1mmxxx@gmail.com` is recognized as the owner account and redirected to the admin panel. The header also shows an **✎ Редактировать** link when that account signs in. The panel can update product names and versions, plan names, access descriptions, USD prices, stock counts, availability, and manual Windows/macOS/Android/iOS version overrides. Clearing a platform override returns it to the automatic WEAO version. Changes are stored in the same KV database and applied on the next public page load.

The header pencil opens the relevant editor: Home (`admin.html?section=home`), Products (including product detail pages), or Exploits. Home settings include separate Russian/English hero and welcome-window text, the displayed promo code/discount, and Telegram/Discord links. Exploit settings can override each card's version and online/offline status, including VNG status where shown. Blank versions and the automatic status option return to the external or static value. The promo code currently changes the displayed product price; it is not a checkout authorization mechanism.

The admin endpoint checks the HttpOnly session cookie, the verified account email, and the request origin before accepting updates. `ADMIN_EMAILS` can grant access to additional trusted addresses; leave it unset if only the owner should have access. Never put KV or email provider tokens in client-side files.
