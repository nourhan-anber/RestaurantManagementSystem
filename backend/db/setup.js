import pkg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Client } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

async function setup() {
  await client.connect();
  console.log('✅ Connected to PostgreSQL');

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  const seed   = readFileSync(join(__dirname, 'seed.sql'),   'utf-8');

  console.log('⏳ Running schema...');
  await client.query(schema);
  console.log('✅ Schema applied');

  console.log('⏳ Running seed data...');
  await client.query(seed);
  console.log('✅ Seed data inserted');

  await client.end();
  console.log('🎉 Database setup complete!');
}

setup().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  client.end();
  process.exit(1);
});
