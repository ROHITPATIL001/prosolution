-- ProSolution database schema for Neon PostgreSQL
-- Apply with:  npm run db:migrate
-- Every statement uses IF NOT EXISTS, so re-running this file is safe.
-- Primary keys are UUIDs (gen_random_uuid() is built into PostgreSQL 13+).

-- ---------------------------------------------------------------------------
-- Identity and profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email           text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash   text NOT NULL,
  role            text NOT NULL CHECK (role IN ('customer', 'provider', 'admin')),
  account_status  text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id              uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  phone                text CHECK (phone IS NULL OR char_length(phone) <= 30),
  address_preferences  text CHECK (address_preferences IS NULL OR char_length(address_preferences) <= 300),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_profiles (
  user_id                  uuid PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  bio                      text CHECK (bio IS NULL OR char_length(bio) <= 1000),
  skills                   text[] NOT NULL DEFAULT '{}',
  phone                    text CHECK (phone IS NULL OR char_length(phone) <= 30),
  service_area             text CHECK (service_area IS NULL OR char_length(service_area) <= 120),
  street_address           text CHECK (street_address IS NULL OR char_length(street_address) <= 200), -- private: never shown publicly
  latitude                 double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude                double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  verification_status      text NOT NULL DEFAULT 'pending'
                             CHECK (verification_status IN ('pending', 'approved', 'rejected', 'needs_more_info')),
  verification_decided_at  timestamptz,
  verification_reviewed_by uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provider_profiles_verification_idx ON provider_profiles (verification_status);

-- ---------------------------------------------------------------------------
-- Service catalogue, offerings and availability
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provider_services (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  uuid NOT NULL REFERENCES provider_profiles (user_id) ON DELETE CASCADE,
  category_id  uuid NOT NULL REFERENCES service_categories (id),
  description  text CHECK (description IS NULL OR char_length(description) <= 500),
  base_price   numeric(10, 2) NOT NULL CHECK (base_price >= 0),
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider_id, category_id)
);
CREATE INDEX IF NOT EXISTS provider_services_category_idx ON provider_services (category_id) WHERE is_active;

CREATE TABLE IF NOT EXISTS provider_availability (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id      uuid NOT NULL REFERENCES provider_profiles (user_id) ON DELETE CASCADE,
  weekday          smallint CHECK (weekday IS NULL OR weekday BETWEEN 0 AND 6), -- 0 = Sunday
  start_time       time,
  end_time         time,
  unavailable_date date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (weekday IS NOT NULL AND start_time IS NOT NULL AND end_time IS NOT NULL
       AND end_time > start_time AND unavailable_date IS NULL)
    OR
    (unavailable_date IS NOT NULL AND weekday IS NULL AND start_time IS NULL AND end_time IS NULL)
  )
);
CREATE INDEX IF NOT EXISTS provider_availability_provider_idx ON provider_availability (provider_id);

-- ---------------------------------------------------------------------------
-- Requests, quotations and bookings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id         uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id         uuid NOT NULL REFERENCES service_categories (id),
  description         text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  area                text NOT NULL CHECK (char_length(area) BETWEEN 1 AND 120), -- public locality shown to providers
  address             text NOT NULL CHECK (char_length(address) BETWEEN 1 AND 200), -- private: revealed after acceptance only
  latitude            double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude           double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  preferred_at        timestamptz,
  status              text NOT NULL DEFAULT 'submitted' CHECK (status IN (
                        'submitted', 'quotations_received', 'quotation_accepted',
                        'provider_on_the_way', 'work_in_progress', 'completed', 'cancelled')),
  cancellation_reason text CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500),
  cancelled_by        uuid REFERENCES users (id) ON DELETE SET NULL,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS service_requests_customer_idx ON service_requests (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_open_idx ON service_requests (status, category_id);

CREATE TABLE IF NOT EXISTS request_attachments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  storage_key   text NOT NULL UNIQUE,
  original_name text NOT NULL,
  file_type     text NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes    integer NOT NULL CHECK (size_bytes > 0),
  uploaded_by   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS request_attachments_request_idx ON request_attachments (request_id);

CREATE TABLE IF NOT EXISTS quotations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         uuid NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  provider_id        uuid NOT NULL REFERENCES provider_profiles (user_id) ON DELETE CASCADE,
  total_estimate     numeric(10, 2) NOT NULL CHECK (total_estimate > 0),
  labour_cost        numeric(10, 2) NOT NULL CHECK (labour_cost >= 0),
  material_cost      numeric(10, 2) NOT NULL CHECK (material_cost >= 0),
  estimated_duration text NOT NULL CHECK (char_length(estimated_duration) BETWEEN 1 AND 80),
  warranty_text      text CHECK (warranty_text IS NULL OR char_length(warranty_text) <= 300),
  notes              text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'withdrawn', 'accepted', 'not_selected')),
  expires_at         timestamptz NOT NULL,   -- 'expired' is derived: active AND expires_at <= now()
  withdrawn_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, provider_id),          -- one quotation per provider per request (revised in place)
  CHECK (total_estimate >= labour_cost + material_cost)
);
CREATE INDEX IF NOT EXISTS quotations_provider_idx ON quotations (provider_id, status);
CREATE INDEX IF NOT EXISTS quotations_request_idx ON quotations (request_id);

CREATE TABLE IF NOT EXISTS bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UNIQUE on request_id and quotation_id is the database-level guarantee that
  -- only ONE quotation can be accepted for a request (FR-13, race-condition control).
  request_id          uuid NOT NULL UNIQUE REFERENCES service_requests (id) ON DELETE CASCADE,
  quotation_id        uuid NOT NULL UNIQUE REFERENCES quotations (id),
  customer_id         uuid NOT NULL REFERENCES users (id),
  provider_id         uuid NOT NULL REFERENCES users (id),
  status              text NOT NULL DEFAULT 'quotation_accepted' CHECK (status IN (
                        'quotation_accepted', 'provider_on_the_way', 'work_in_progress',
                        'completed', 'cancelled')),
  accepted_at         timestamptz NOT NULL DEFAULT now(),
  completed_at        timestamptz,
  cancelled_at        timestamptz,
  cancelled_by        uuid REFERENCES users (id) ON DELETE SET NULL,
  cancellation_reason text CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bookings_provider_idx ON bookings (provider_id, status);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings (customer_id, status);

-- ---------------------------------------------------------------------------
-- Messaging
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  request_id    uuid NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, provider_id, request_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body             text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at       timestamptz NOT NULL DEFAULT now(),
  read_at          timestamptz
);
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Verification and WorkProof
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS provider_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    uuid NOT NULL REFERENCES provider_profiles (user_id) ON DELETE CASCADE,
  storage_key    text NOT NULL UNIQUE,         -- private: served only through authorised route
  original_name  text NOT NULL,
  file_type      text NOT NULL CHECK (file_type IN ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes     integer NOT NULL CHECK (size_bytes > 0),
  document_type  text NOT NULL CHECK (document_type IN ('identity', 'certificate', 'licence', 'insurance', 'other')),
  review_status  text NOT NULL DEFAULT 'pending'
                   CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_more_info')),
  reviewed_by    uuid REFERENCES users (id) ON DELETE SET NULL,
  review_notes   text CHECK (review_notes IS NULL OR char_length(review_notes) <= 1000),
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  reviewed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS provider_documents_provider_idx ON provider_documents (provider_id);

CREATE TABLE IF NOT EXISTS work_photos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    uuid NOT NULL REFERENCES provider_profiles (user_id) ON DELETE CASCADE,
  booking_id     uuid REFERENCES bookings (id) ON DELETE SET NULL,   -- optional link to a completed job
  storage_key    text NOT NULL UNIQUE,
  original_name  text NOT NULL,
  file_type      text NOT NULL CHECK (file_type IN ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes     integer NOT NULL CHECK (size_bytes > 0),
  caption        text CHECK (caption IS NULL OR char_length(caption) <= 200),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_photos_provider_idx ON work_photos (provider_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         uuid NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
  customer_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider_id        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rating             smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text        text CHECK (review_text IS NULL OR char_length(review_text) <= 1000),
  moderation_status  text NOT NULL DEFAULT 'published' CHECK (moderation_status IN ('published', 'flagged', 'hidden')),
  moderated_by       uuid REFERENCES users (id) ON DELETE SET NULL,
  moderated_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_provider_idx ON reviews (provider_id, moderation_status);

-- ---------------------------------------------------------------------------
-- Complaints, notifications, promotions, commission and audit
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS complaints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       uuid REFERENCES bookings (id) ON DELETE SET NULL,
  raised_by        uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  against_user_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category         text NOT NULL CHECK (category IN ('payment', 'quality', 'behaviour', 'cancellation', 'other')),
  description      text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  status           text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  resolution_notes text CHECK (resolution_notes IS NULL OR char_length(resolution_notes) <= 2000),
  resolved_by      uuid REFERENCES users (id) ON DELETE SET NULL,
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (raised_by <> against_user_id)
);
CREATE INDEX IF NOT EXISTS complaints_status_idx ON complaints (status, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL CHECK (char_length(title) <= 160),
  body        text CHECK (body IS NULL OR char_length(body) <= 500),
  target_url  text CHECK (target_url IS NULL OR target_url LIKE '/%'),
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, read_at, created_at DESC);

CREATE TABLE IF NOT EXISTS promotions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    uuid NOT NULL REFERENCES provider_profiles (user_id) ON DELETE CASCADE,
  campaign_name  text NOT NULL CHECK (char_length(campaign_name) BETWEEN 1 AND 120),
  start_at       timestamptz NOT NULL,
  end_at         timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  simulated_fee  numeric(10, 2) NOT NULL DEFAULT 0 CHECK (simulated_fee >= 0),  -- simulated only: no payment collected
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at)
);

CREATE TABLE IF NOT EXISTS commission_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        uuid NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  rate              numeric(5, 4) NOT NULL CHECK (rate >= 0 AND rate <= 1),
  estimated_amount  numeric(10, 2) NOT NULL CHECK (estimated_amount >= 0),
  status            text NOT NULL DEFAULT 'simulated' CHECK (status IN ('simulated')),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commission_records_booking_idx ON commission_records (booking_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  action          text NOT NULL,
  target_type     text NOT NULL,
  target_id       text NOT NULL,
  metadata_json   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_target_idx ON audit_logs (target_type, target_id, created_at DESC);
