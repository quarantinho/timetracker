require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=disable`
});

const schema = `
  DROP TABLE IF EXISTS time_entries;
  DROP TABLE IF EXISTS projects;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(200) NOT NULL,
      role VARCHAR(20) DEFAULT 'employee',
      avatar VARCHAR(10) DEFAULT '👤',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) DEFAULT '#3b82f6',
      created_by INTEGER REFERENCES users(id)
  );

  CREATE TABLE time_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      project_id INTEGER REFERENCES projects(id),
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      duration_seconds INTEGER DEFAULT 0
  );
`;

async function setup() {
  try {
    console.log('🔄 Resetting database...');
    await pool.query(schema);

    // Create one default admin user
    const hashedPass = await bcrypt.hash('123456', 10);
    await pool.query(
      "INSERT INTO users (name, email, password, role, avatar) VALUES ($1, $2, $3, $4, $5)",
      ['Admin User', 'admin@time.app', hashedPass, 'admin', '👑']
    );

    console.log('✅ Database upgraded! Default login: admin@time.app / 123456');
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await pool.end();
  }
}

setup();