import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runSeed(client) {
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
}

export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'users'
      ) AS exists`
    );

    if (rows[0].exists) {
      console.log('Database tables already exist — skipping init');
      return;
    }

    console.log('No tables found — initializing database...');

    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Schema created successfully');

    await runSeed(client);
  } finally {
    client.release();
  }
}

export async function resetDatabase() {
  const client = await pool.connect();
  try {
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

    console.log('Recreating schema...');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('Schema created successfully');

    await runSeed(client);

    console.log('Database reset complete!');
  } finally {
    client.release();
  }
}
