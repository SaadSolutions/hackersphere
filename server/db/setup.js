#!/usr/bin/env node
/**
 * Database setup script - creates schema and seeds data
 * Usage: node db/setup.js [--seed]
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'hackersphere',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
      }
);

async function runSQL(filePath, label) {
  const sql = fs.readFileSync(filePath, 'utf8');
  console.log(`\nRunning ${label}...`);
  try {
    await pool.query(sql);
    console.log(`✓ ${label} completed`);
  } catch (err) {
    console.error(`✗ ${label} failed:`, err.message);
    throw err;
  }
}

async function setup() {
  const args = process.argv.slice(2);
  const shouldSeed = args.includes('--seed') || args.includes('-s');

  try {
    console.log('HackerSphere Database Setup');
    console.log('============================');

    // Test connection
    const client = await pool.connect();
    console.log('✓ Connected to PostgreSQL');
    client.release();

    await runSQL(path.join(__dirname, 'schema.sql'), 'Schema');

    if (shouldSeed) {
      await runSQL(path.join(__dirname, 'seed.sql'), 'Seed data');
    }

    console.log('\n✓ Database setup complete!');
    if (!shouldSeed) {
      console.log('  Tip: Run with --seed flag to populate sample data');
    }
  } catch (err) {
    console.error('\nSetup failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
