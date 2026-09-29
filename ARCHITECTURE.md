# Application architecture

The root Vite application (`src/`) is the active ScrapLink frontend. Root `npm run server` and `npm start` run the active Express API at `server/index.mjs`.

## Request and realtime flow

```text
Browser (Vite / Vercel)
  ├── HTTP bearer token → Express API → MongoDB
  └── authenticated Socket.IO connection → role and participant rooms
```

API and Socket.IO access use signed expiring bearer tokens backed by active MongoDB user records. Socket payloads contain resource/action metadata; clients refresh scoped API data after receiving an event. Private event IDs are sent only to involved account rooms and administrators. Public marketplace refresh events contain no pickup identifiers.

The API enforces role authorization, exact-origin CORS, request and sign-in rate limits, JSON size limits, secure headers, and structured request logs. User passwords are hashed with Node's scrypt implementation. Token versions invalidate sessions on logout or account deactivation.

## Workflow API

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/bootstrap`, `GET /api/catalog`
- `POST /api/pickups`, `POST /api/pickups/:id/accept`, `POST /api/pickups/:id/complete`
- `GET /api/pickups/:id/recycler-matches`
- `GET /api/offers/marketplace`, `POST /api/offers/:lotId`, `GET /api/offers`, and offer accept/decline/schedule/received actions
- `GET /api/collector/ledger` and administrator payment settlement
- `POST /api/batches/:id/receive`, `POST /api/batches/:id/process`
- `/api/admin/*` for operations, user/facility verification, materials, prices, and audit records
- `GET /api/handovers/:id/verify` for public handover integrity verification

MongoDB models include `User`, `ScrapLot`, `RecyclerOffer`, `RecyclerFacility`, `Payment`, `LedgerTransaction`, `HandoverRecord`, and `AuditLog`. Pickup and batch data plus material and price catalogs currently live in a persisted MongoDB `PlatformState` document.

Offline collection drafts and queued completions remain in IndexedDB. Every operation is bound to the collector account that created it and the API rechecks pickup ownership; only server-confirmed records appear in business dashboards.

## Other directories

- `server/src/` contains an older alternate Express/Mongoose API scaffold; it is not run by root scripts.
- `client/` is an older isolated frontend scaffold and is not included in the root build.

See [README.md](README.md) for account provisioning, deployment configuration, verification steps, and payment limitations.
