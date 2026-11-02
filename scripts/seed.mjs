// Seeds categories, an administrator and demo accounts. Safe to re-run.
// Usage: npm run db:seed   (run db:migrate first)
//
// Demo passwords come from ADMIN_PASSWORD (admin) and DEMO_PASSWORD (demo accounts).
// Change every one of them before any real use.
import bcrypt from 'bcryptjs';
import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Add it to .env first.');
  process.exit(1);
}

const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@prosolution.local').toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD ?? 'ChangeMe123';
const demoPassword = process.env.DEMO_PASSWORD ?? 'Demo12345';

const CATEGORIES = [
  'Electrician', 'Plumber', 'Mechanic', 'Carpenter', 'Cleaning', 'Tutor',
  'Painter', 'Appliance Repair', 'AC Repair', 'Gardening', 'Pest Control', 'Other Services',
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertUser(client, { name, email, password, role }) {
  const hash = await bcrypt.hash(password, 12);
  const rows = await client.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name, email, hash, role],
  );
  return rows.rows[0].id;
}

const client = await pool.connect();
try {
  await client.query('BEGIN');

  for (const name of CATEGORIES) {
    await client.query(
      `INSERT INTO service_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [name],
    );
  }

  await upsertUser(client, { name: 'ProSolution Admin', email: adminEmail, password: adminPassword, role: 'admin' });

  const customerId = await upsertUser(client, {
    name: 'Demo Customer', email: 'customer@demo.local', password: demoPassword, role: 'customer',
  });
  await client.query(
    `INSERT INTO customer_profiles (user_id, phone) VALUES ($1, '+1 555 0100') ON CONFLICT (user_id) DO NOTHING`,
    [customerId],
  );

  const providers = [
    {
      name: 'Demo Electrician', email: 'provider@demo.local', status: 'approved',
      bio: 'Licensed residential electrician with 8 years of experience.',
      skills: ['Wiring', 'Fuse boxes', 'Lighting'], area: 'Central District',
      lat: 40.7128, lng: -74.006, category: 'Electrician', price: 60,
    },
    {
      name: 'Demo Plumber', email: 'plumber@demo.local', status: 'pending',
      bio: 'Emergency plumbing and leak repair. Verification pending.',
      skills: ['Leak repair', 'Drain cleaning'], area: 'North Side',
      lat: 40.7829, lng: -73.9654, category: 'Plumber', price: 55,
    },
  ];

  for (const p of providers) {
    const userId = await upsertUser(client, {
      name: p.name, email: p.email, password: demoPassword, role: 'provider',
    });
    await client.query(
      `INSERT INTO provider_profiles
         (user_id, bio, skills, phone, service_area, street_address, latitude, longitude, verification_status, verification_decided_at)
       VALUES ($1, $2, $3, '+1 555 0199', $4, '1 Demo Street (private)', $5, $6, $7,
               CASE WHEN $7 = 'approved' THEN now() END)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId, p.bio, p.skills, p.area, p.lat, p.lng, p.status],
    );
    const category = await client.query(`SELECT id FROM service_categories WHERE name = $1`, [p.category]);
    await client.query(
      `INSERT INTO provider_services (provider_id, category_id, description, base_price)
       VALUES ($1, $2, 'Standard call-out and repair work', $3)
       ON CONFLICT (provider_id, category_id) DO NOTHING`,
      [userId, category.rows[0].id, p.price],
    );
    await client.query(
      `INSERT INTO provider_availability (provider_id, weekday, start_time, end_time)
       SELECT $1, d, '09:00', '17:00' FROM generate_series(1, 5) AS d
       WHERE NOT EXISTS (SELECT 1 FROM provider_availability WHERE provider_id = $1)`,
      [userId],
    );
  }

  await client.query('COMMIT');
  console.log('Seed complete.');
  console.log(`  Admin:            ${adminEmail}  (password from ADMIN_PASSWORD)`);
  console.log('  Customer:         customer@demo.local  (password from DEMO_PASSWORD, default Demo12345)');
  console.log('  Provider (approved): provider@demo.local');
  console.log('  Provider (pending):  plumber@demo.local');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
