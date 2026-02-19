import pg from 'pg';
import bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function dropAllTables(client) {
  console.log('Dropping all tables...');
  await client.query(`
    DROP TABLE IF EXISTS likes CASCADE;
    DROP TABLE IF EXISTS comments CASCADE;
    DROP TABLE IF EXISTS ratings CASCADE;
    DROP TABLE IF EXISTS showcase_inquiries CASCADE;
    DROP TABLE IF EXISTS builder_offers CASCADE;
    DROP TABLE IF EXISTS build_requests CASCADE;
    DROP TABLE IF EXISTS build_parts CASCADE;
    DROP TABLE IF EXISTS builds CASCADE;
    DROP TABLE IF EXISTS parts CASCADE;
    DROP TABLE IF EXISTS part_categories CASCADE;
    DROP TABLE IF EXISTS builder_applications CASCADE;
    DROP TABLE IF EXISTS builder_profiles CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    DROP TYPE IF EXISTS user_role CASCADE;
    DROP TYPE IF EXISTS application_type CASCADE;
    DROP TYPE IF EXISTS application_status CASCADE;
    DROP TYPE IF EXISTS build_status CASCADE;
    DROP TYPE IF EXISTS build_type CASCADE;
    DROP TYPE IF EXISTS availability_status CASCADE;
    DROP TYPE IF EXISTS request_status CASCADE;
    DROP TYPE IF EXISTS offer_status CASCADE;
    DROP TYPE IF EXISTS inquiry_status CASCADE;
  `);
  console.log('All tables dropped successfully');
}

async function runSeed(client) {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await client.query(schema);
  console.log('Schema created successfully');

  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('password123', 10);

  let seedSQL = readFileSync(join(__dirname, 'seed.sql'), 'utf8');

  seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_admin_hash_will_be_set_by_seed_script__/g, adminHash);
  seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_user1_hash_will_be_set_by_seed_script__/g, userHash);
  seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_user2_hash_will_be_set_by_seed_script__/g, userHash);
  seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_build1_hash_will_be_set_by_seed_script/g, userHash);
  seedSQL = seedSQL.replace(/\$2b\$10\$placeholder_build2_hash_will_be_set_by_seed_script/g, userHash);

  await client.query(seedSQL);
  console.log('Seed data inserted successfully');

  const { rows: users } = await client.query('SELECT id, email, role FROM users ORDER BY email');
  console.log('Users:', users);
  const { rows: partCount } = await client.query('SELECT COUNT(*) FROM parts');
  console.log('Parts:', partCount[0].count);
  const { rows: buildCount } = await client.query('SELECT COUNT(*) FROM builds');
  console.log('Builds:', buildCount[0].count);
}

async function seed(reset = false) {
  const client = await pool.connect();
  try {
    if (reset) {
      await dropAllTables(client);
    }

    await runSeed(client);

    if (reset) {
      console.log('Database reset and reseeded successfully!');
    }
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

const args = process.argv.slice(2);
const shouldReset = args.includes('--reset') || args.includes('-r');

seed(shouldReset);
