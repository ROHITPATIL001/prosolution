# ProSolution

A mobile-first local services marketplace. Customers post a job, compare quotations side by side with **FairQuote**, and book a provider. Providers manage their services, availability, quotations and **WorkProof** history. Administrators verify providers, moderate reviews, resolve complaints and view analytics.

Built to the *ProSolution Complete Project Requirements & Startup Plan*.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Neon PostgreSQL · bcryptjs · zod

> Academic prototype. Real-world payments, legal compliance, identity verification and production security need further review before any commercial launch (see the requirements, Section 4 and Section 15).

---

## 1. Quick start (local)

Requirements: **Node.js 22.9 or newer**, a free **Neon** project (https://neon.tech).

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file and fill it in
cp .env.example .env
#    - DATABASE_URL       : Neon connection string
#    - SESSION_SECRET     : a random string of 32+ characters
#      (e.g. `openssl rand -base64 48`)

# 3. Create the database tables
npm run db:migrate

# 4. Add service categories and demo accounts (optional, recommended)
npm run db:seed

# 5. Run the app
npm run dev
```

Open http://localhost:3000.

### Demo accounts (after `db:seed`)

| Role     | Email                   | Password                                  |
|----------|-------------------------|-------------------------------------------|
| Admin    | value of `ADMIN_EMAIL`  | value of `ADMIN_PASSWORD` (default `ChangeMe123`) |
| Customer | `customer@demo.local`   | `DEMO_PASSWORD` (default `Demo12345`)     |
| Provider (verified) | `provider@demo.local` | `DEMO_PASSWORD`                    |
| Provider (pending)  | `plumber@demo.local`  | `DEMO_PASSWORD`                    |

**Change every default password before sharing the app with anyone.**

### Scripts

| Command            | What it does                                              |
|--------------------|-----------------------------------------------------------|
| `npm run dev`      | Development server                                        |
| `npm run build`    | Production build (run before deploying)                   |
| `npm run start`    | Serve the production build                                |
| `npm run typecheck`| TypeScript check without emitting files                   |
| `npm test`         | Unit tests for the business rules (quotation expiry, booking transitions, upload checks, etc.) |
| `npm run db:migrate` | Apply `db/schema.sql` to the database (safe to re-run)  |
| `npm run db:seed`  | Insert categories and demo accounts (safe to re-run)      |

---

## 2. Project structure

```
prosolution/
├── db/schema.sql              Logical schema from Section 12, with constraints and indexes
├── scripts/
│   ├── migrate.mjs            Applies schema.sql to Neon
│   └── seed.mjs               Categories + demo accounts
├── tests/rules.test.ts        Unit tests for pure business rules
├── src/
│   ├── app/
│   │   ├── layout.tsx         Root layout, header, light-mode theme
│   │   ├── page.tsx           Redirects to the user's home screen
│   │   ├── login/ register/   Authentication screens
│   │   ├── customer/          Customer screens (guarded by customer/layout.tsx)
│   │   ├── provider/          Provider screens (guarded by provider/layout.tsx)
│   │   ├── admin/             Admin screens (guarded by admin/layout.tsx)
│   │   ├── messages/          Shared conversation list and thread
│   │   ├── notifications/     Shared in-website notifications
│   │   ├── complaints/        Shared complaint filing (customers and providers)
│   │   ├── api/files/[kind]/[id]/route.ts   Authorised file download (documents, photos)
│   │   ├── actions/           Server actions: all writes and business logic entry points
│   │   ├── loading.tsx error.tsx not-found.tsx
│   ├── components/            Shared UI (cards, badges, flash messages, pager, app shell)
│   └── lib/
│       ├── rules.ts           Pure business rules (no framework imports; unit-tested)
│       ├── auth.ts            Password hashing, signed session cookie, role guards
│       ├── db.ts              Neon connection pool, transactions
│       ├── storage.ts         File storage adapter (local disk in development)
│       ├── notify.ts          Notifications and audit log helpers
│       ├── errors.ts          Expected-error handling for server actions
│       ├── forms.ts           FormData helpers and flash redirects
│       ├── constants.ts       Labels, expiry days, commission rate
│       └── format.ts          Money, date and rating formatting
├── .env.example
└── README.md
```

---

## 3. How the requirements are implemented

| Req. | Status | Notes |
|------|--------|-------|
| FR-01 Authentication | Implemented | Email and password. bcrypt (cost 12). Signed, httpOnly session cookie. Password reset is **not** included (marked "if implemented" in the spec). |
| FR-02 Role-based access | Implemented | Role checked server-side in each layout, page and server action. Role and account status are re-read from the database on every request. |
| FR-03 Customer profile | Implemented | `/customer/profile` |
| FR-04 Provider profile | Implemented | Bio, skills, service area, services and prices, working hours, unavailable dates. `/provider/profile` |
| FR-05 Provider verification | Implemented | Upload documents (magic-byte checked), Pending → Approved / Rejected / Needs more information, reviewer notes, audit trail. |
| FR-06 WorkProof | Implemented | Work photos, optionally linked to the provider's own completed job. Reviews only for completed bookings. |
| FR-07 Provider discovery | Implemented | Category, area text, maximum price, minimum rating, weekday availability. Only verified providers appear. |
| FR-08 Location | Partial | Stores latitude and longitude and shows approximate distance. Coordinates are typed in; a map pin picker needs a map provider key (see §6). Street addresses are private and shared only after acceptance. |
| FR-09 Service request | Implemented | Category, description, area, private address, preferred time, up to 3 photos. |
| FR-10 Quotations | Implemented | Total, labour, materials, completion time, warranty, notes. One quotation per provider per request, revised in place until withdrawn or accepted. |
| FR-11 FairQuote | Implemented | Side-by-side cards (stacked on phones) showing every agreed field, provider rating and review count. Estimates are labelled. No ranking by price alone. |
| FR-12 Quotation expiry | Implemented | `expires_at` set from `QUOTE_EXPIRY_DAYS` (default 7). Expired quotations show as expired and cannot be accepted. Expiry is evaluated at read time, so no background job is needed. |
| FR-13 Acceptance | Implemented | Row-locked transaction. Other quotations are closed. `UNIQUE(request_id)` on bookings is the database backstop against double acceptance. |
| FR-14 Messaging | Implemented | Opens once a provider has quoted. Only the two participants can read a thread. Refresh to see new messages (no live push). |
| FR-15 Booking statuses | Implemented | Request Submitted → Quotations Received → Quotation Accepted → Provider on the Way → Work in Progress → Completed, plus Cancelled. Transitions enforced in `rules.ts`. |
| FR-16 Cancellation | Implemented | Customers can cancel open requests. Either party can cancel a booking before work starts. Reason, actor and time are recorded. Cancellation takes effect immediately (no approval step). |
| FR-17 Reviews | Implemented | One review per completed booking, by its customer. Providers can report a review; admins publish or hide it. |
| FR-18 Complaints | Implemented | File against a booking. Admin moves it to Under review / Resolved / Closed with notes. Complainant is notified. |
| FR-19 Notifications | Implemented | In-website list with unread badge, linked to the relevant screen. No email or push. |
| FR-20 Account management | Implemented | Suspend and reactivate customers and providers. Each action is audit-logged. Admin accounts are not suspended from the UI. |
| FR-21 Booking management | Implemented | Admin bookings and latest quotations view. |
| FR-22 Analytics | Implemented | Overview: customers, verified providers, requests, quotation acceptance rate, completed jobs, average rating, popular categories, top providers, open complaints, simulated commission. |
| FR-23 Business model | Simulated | Commission recorded per completed job (`COMMISSION_RATE`, default 5%). Promotions recorded with a simulated fee. No payments are collected. |
| FR-24 Sustainability | Partial | Admin overview shows verified providers and completed jobs by category, and a digital-records count. There is no separate public impact page. |
| FR-25 File storage | Implemented (local) | Files are validated, stored under random keys, and served only through `/api/files/...` after an authorisation check. The metadata lives in Neon. Local disk is for development (see §6 for production). |
| FR-26 Error handling | Implemented | Server-side validation, flash messages, loading and error screens, retry guidance. |

Section 9 rules are enforced: a verified badge is described as "reviewed documents, not a guarantee"; only admins change verification; private documents need authorisation; uploads are checked by content, not file name.

---

## 4. Security notes

- Passwords are hashed with bcrypt. Plaintext is never stored.
- Every write is a server action or route handler that calls `requireRole` or `requireUser`. Hiding a link in the UI is never the only check.
- Session cookie: HMAC-SHA256 signed, httpOnly, SameSite=Lax, Secure in production, 7-day expiry. Suspended accounts lose access on the next request.
- Input is validated on the server with `rules.ts` and length limits that mirror the database `CHECK` constraints.
- Private documents are served only to the uploading provider or an admin, with `Cache-Control: private, no-store`.
- Secrets live in environment variables. `.env` is git-ignored. Only `.env.example` is committed.
- Security headers: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`.

Not yet implemented (recommended before any real use): rate limiting on login, CSRF tokens beyond Next.js's built-in server-action origin checks, malware scanning of uploads, password reset, email verification, backups and monitoring.

---

## 5. Testing

```bash
npm test          # 17 unit tests for the business rules
npm run typecheck # TypeScript
npm run build     # Next.js production build
```

The unit tests cover quotation expiry, single acceptance, amount validation, booking transitions, cancellation rules, review eligibility, rating ranges, verification notes, commission, distance, pagination, skills parsing, password and email rules, availability windows, upload checks and file signature detection.

The database schema and the main read and write queries were checked against PostgreSQL 16, including the constraints that block double acceptance, duplicate reviews, invalid quotation amounts and reversed availability windows.

Still to do (Section 18): end-to-end browser tests of the customer → provider → review journey, and manual checks on phone-sized screens and slow networks.

---

## 6. Deploying (Vercel + Neon + GitHub)

1. Push the project to a GitHub repository. `.env` is ignored by git.
2. Create a Neon project and copy its connection string. Run `npm run db:migrate` once with `DATABASE_URL` set locally, then `npm run db:seed` if you want demo data.
3. In Vercel, import the GitHub repository and add these environment variables: `DATABASE_URL`, `SESSION_SECRET`, `QUOTE_EXPIRY_DAYS`, `COMMISSION_RATE`, `MAX_UPLOAD_MB`.
4. **Replace local file storage before deploying.** Vercel's filesystem is read-only and temporary, so `src/lib/storage.ts` must be changed to a cloud object store (for example S3-compatible storage or Vercel Blob in private mode). Keep the same contract: random keys, no public URLs, and reads only through the authorised route.
5. Optional: add a map provider (for example Google Maps or Leaflet with a tile service) to replace the coordinate fields with a pin picker. Restrict the API key by domain and set usage limits, as Section 11 requires.

---

## 7. Known limitations

- Location search is by area text. A radius search can be added with the same haversine helper used in `rules.ts`.
- Messages and notifications refresh on page load. Live updates need polling or a realtime service.
- Quotation expiry is evaluated when the page or action runs, which is correct but leaves an `active` status in the table until someone opens the record.
- The demo storage and map fields are placeholders for the production choices listed in Section 22 of the requirements.
- Pagination is page-number based. For very large data sets, switch to keyset pagination.

---

## 8. Milestones

This codebase follows the milestone order in Section 20 and the implementation order in Section 23:

1. Requirements and architecture: see the requirements document.
2. Setup, schema, authentication and role guards: `db/`, `src/lib/auth.ts`, `src/app/actions/auth.ts`, layouts.
3. Provider profiles, services, availability and location: `provider/profile`, `actions/provider.ts`.
4. Requests, quotations, FairQuote and expiry: `customer/requests`, `provider/requests`, `lib/rules.ts`.
5. Bookings, messaging and notifications: `actions/bookings.ts`, `messages/`, `notifications/`.
6. WorkProof, uploads, verification, reviews and complaints: `provider/documents`, `provider/work-photos`, `admin/verification`, `admin/complaints`.
7. Analytics, sustainability and business model reporting: `admin/page.tsx`, `admin/promotions`.
8. Mobile polish, tests and deployment: `tests/`, responsive layouts, README.
