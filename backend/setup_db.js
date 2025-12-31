require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=disable`
});

const schema = `
  -- DROP TABLES TO RESET (OPTIONAL, BE CAREFUL IN PRODUCTION)
  DROP TABLE IF EXISTS time_entries;
  DROP TABLE IF EXISTS projects;
  DROP TABLE IF EXISTS users;

  -- 1. USERS
  CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      avatar VARCHAR(10) DEFAULT '👤',
      role VARCHAR(20) DEFAULT 'employee'
  );

  -- 2. PROJECTS
  CREATE TABLE projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT '#3b82f6'
  );

  -- 3. TIME ENTRIES
  CREATE TABLE time_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      project_id INTEGER REFERENCES projects(id),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      duration_seconds INTEGER DEFAULT 0
  );

  -- INITIAL DATA
  INSERT INTO users (name, role, avatar) VALUES 
  ('Admin User', 'admin', '👨‍💼'),
  ('Max Dev', 'employee', '👨‍💻'),
  ('Lisa Design', 'employee', '👩‍🎨');

  INSERT INTO projects (name, color) VALUES 
  ('Website Relaunch', '#8884d8'), 
  ('Marketing Q1', '#82ca9d'), 
  ('Internal Ops', '#ffc658');
`;

async function setup() {
  try {
    console.log('🔄 Setting up database...');
    await pool.query(schema);
    console.log('✅ Tables created and dummy data inserted!');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

setup();