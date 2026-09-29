# ScrapLink

ScrapLink connects household pickup requests, collectors, recycler offers and handovers, payments, traceability, and municipal administration.

## Architecture

- `src/` is the active Vite + React + TypeScript application.
- `server/index.mjs` is the active Express API. MongoDB stores accounts, recycler facilities, lots, offers, pickups, shared catalog data, transactions, payments, handovers, and audit records.
- Socket.IO authenticates with the same signed bearer token as the API. It emits role and participant scoped update events; the browser reloads authorized records from the API after an event.
- `server/src/` also contains an older API scaffold and is not launched by the root scripts.
- `client/` is an older isolated scaffold and is not part of the root build.

## Local development

Requirements: Node.js 20+ and MongoDB 7+ (or Docker).

```bash
npm ci
cp .env.example .env
```

Configure a reachable MongoDB instance in `.env` as `MONGO_URI`, then run both the API and frontend together:

```bash
npm run dev
```

For local MongoDB with Docker, run `docker compose up -d mongodb` first. The API and Vite output share one terminal; stopping `npm run dev` stops both services.
If the machine's DNS resolver cannot resolve MongoDB Atlas `mongodb+srv` records, optionally set `MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1`; the API uses those resolvers only for MongoDB DNS within its own process.

Open <http://localhost:5173>. Check the API at <http://localhost:8787/api/health>. To create the first administrator, set `ADMIN_PHONE` and a strong `ADMIN_PASSWORD` in `.env` before starting the API. To load the clearly labelled sample accounts and records into MongoDB, run `npm run seed` against a dedicated local or staging database.

Household, collector, and recycler accounts can be provisioned with `POST /api/auth/register`; the endpoint requires a name, phone, role, and password of at least eight characters. Recycler registration also requires a facility name and city and starts with pending verification. For example:

```bash
curl -X POST http://localhost:8787/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"role":"household","name":"Asha Kumar","phone":"+919876543210","password":"use-a-unique-long-password"}'
```

Sign in through the website with the registered phone, email, or account identity and password. Administrators must configure materials and real price observations before household bookings can be valued. Collectors must be verified by an administrator before they appear in household matching. Recycler facilities must be verified and configured for accepted materials before they can submit offers.

## Sample accounts and records

Use a dedicated local or staging MongoDB database. Stop the API before reseeding, run `npm run seed` (or `npm run seed:reset` to clear and recreate the sample dataset), then restart it so the in-memory PlatformState cache reloads. Both commands replace only prior sample records and preserve records not marked as sample. The seed contains 5 collectors, 4 verified recycler facilities, 10 scrap lots, offers, pickup and batch history, handovers, ledger transactions, payments, material rates, and notifications. In production the command refuses to run unless `SAMPLE_MODE=true`; only enable that in an isolated sample deployment.

To reset sample activity, stop the API and run `npm run sample:reset`. It keeps the Customer, Collector, Recycler, and Admin sample accounts, the active verified Recycler facility, and material choices. It clears their requests, lots, offers, pickups, handovers, payments, transactions, notifications, earnings history, and extra sample accounts from MongoDB. The command does not seed or recreate activity. Start the API again so the database-backed state reloads. `npm run seed:empty` remains an alias for the same clean reset.

The sign-in dialog includes selectable sample accounts that fill the email and password fields. They authenticate through the normal MongoDB-backed flow and open the matching role portal. Start MongoDB and the API, then run `npm run seed` before using them:

| Role | Email | Default password |
| --- | --- | --- |
| Customer | `customer@scraplink.example` | `ScrapLink@Customer26` |
| Collector | `collector@scraplink.example` | `ScrapLink@Collector26` |
| Recycler | `recycler@scraplink.example` | `ScrapLink@Recycler26` |
| Admin | `admin@scraplink.example` | `ScrapLink@Admin26` |

Seeded phone numbers use a fictional placeholder pattern and cannot receive calls or OTPs. Remaining sample accounts use the `SAMPLE_PASSWORD` default (`ScrapLink@Customer26`). Set the optional `SAMPLE_COLLECTOR_PASSWORD`, `SAMPLE_RECYCLER_PASSWORD`, and `SAMPLE_ADMIN_PASSWORD` variables in the backend `.env` before running the seed script to override account passwords, and set the matching `VITE_SAMPLE_*` values for the frontend autofill. Restart Vite or rebuild after changing frontend variables. If the API is unavailable, start it with `npm run server` and check <http://localhost:8787/api/health>; sample users must first be created by `npm run seed`.

| Role | Sample account phone |
| --- | --- |
| Collector | `+91-00000-10101` through `+91-00000-10105` |
| Recycler | `+91-00000-10201` through `+91-00000-10204` |
| Household | `+91-00000-10901` |
| Admin | `+91-00000-10999` |

Sample accounts and simulated records are kept separate from live records in MongoDB. Sample accounts see a persistent `SAMPLE DATA` notice, isolated Socket.IO events use separate role rooms, and admin calculations only include records of the signed-in account's data class. Offers, handovers, and payments use the real APIs and database but represent simulated activity, not real-world transactions or settled money. UPI/Jan-Dhan payments remain pending until manually settled, and external recycling references are not independently verified.

For a complete workflow, open two or three separate browser profiles/windows and sign in as a sample collector, recycler, and admin. The collector can publish a lot from the Collector portal. The matching recycler sees it in Lot marketplace, submits an offer, and schedules pickup. The collector accepts the offer from the inbox; the recycler then confirms the received weight. Each portal reloads its scoped MongoDB data on authenticated Socket.IO events, and notifications are persisted per account. Admin payment settlement updates the collector ledger and admin dashboard.

To use another local API, set `VITE_API_PROXY_TARGET` in `.env`. Set `VITE_API_URL` to the browser-facing `/api` endpoint for production builds. Vite proxies both `/api` and `/socket.io` during local development.

## Production build and run

```bash
npm ci
npm run build
```

Configure `MONGO_URI`, `CLIENT_ORIGIN`, `NODE_ENV=production`, and a random `JWT_SECRET` of at least 32 characters, then run `npm start`. Generate a secret with `openssl rand -base64 48`. Set the optional `ADMIN_PHONE` and `ADMIN_PASSWORD` if this database does not yet have an administrator. Never commit these values or put them in Vite-prefixed variables.

## Deploy frontend to Vercel

1. Import the repository into Vercel. `vercel.json` configures Vite, `npm run build`, `dist`, and SPA route fallback.
2. Set `VITE_API_URL` to the backend origin plus `/api` (for example `https://your-api.onrender.com/api`) and redeploy after changing it.
3. Add the exact Vercel production and preview origins that need access to `CLIENT_ORIGIN` on the backend.

## Deploy API to Render or Railway

The included `render.yaml` runs the root API with `npm run server`. Configure:

- `MONGO_URI`: MongoDB Atlas URI for a least-privilege database user.
- `CLIENT_ORIGIN`: comma-separated frontend origins.
- `JWT_SECRET`: a unique random value of at least 32 characters.
- `ADMIN_PHONE` and `ADMIN_PASSWORD`: optional first-administrator bootstrap values.
- `NODE_ENV=production` and the platform-provided `PORT`.

For Railway, use the repository root, `npm ci` as the build command, `npm run server` as the start command, and `/api/health` as the health check. Do not expose Atlas credentials in frontend variables or source control. The backend uses exact-origin CORS, secure headers, request size limits, rate limits, and structured request logs.

## Operational limitations

- Core pickup, batch, material, and price records currently share a MongoDB `PlatformState` document. Financial, user, lot, offer, facility, handover, and audit records use dedicated MongoDB collections. Move the remaining arrays to dedicated collections and run backup, load, and multi-instance concurrency tests before high-volume deployment.
- UPI and bank transfer methods are recorded as pending because no payment provider is configured. Cash is recorded as paid at collection; an administrator can mark a pending payment settled after external confirmation.
- The app records manually entered weight. It does not connect to Bluetooth scales, identity providers, or external recycler directories.
- A MongoDB instance and seeded sample accounts are required for the quick-login flow. Production users must be provisioned separately.

## Verification

```bash
npm run build
npm run lint
node --check server/index.mjs
```

After deployment, verify `/api/health`, sign in with separate collector, recycler, and admin sample accounts, confirm role-specific access, and check that a pickup, recycler offer, accepted offer, handover, payment update, and Socket.IO event appear in the relevant portals without a refresh. Automated builds and syntax checks do not replace this browser-based workflow verification against a running MongoDB service.

## License

MIT. See [LICENSE](LICENSE).
