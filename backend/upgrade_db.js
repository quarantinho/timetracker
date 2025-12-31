require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT }
);

const sql = `
  -- 1. Create Tasks Table
  CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
  );

  -- 2. Add task_id to Time Entries (if it doesn't exist)
  DO $$ 
  BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='time_entries' AND column_name='task_id') THEN 
      ALTER TABLE time_entries ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL; 
    END IF; 
  END $$;
`;

async function run() {
  try {
    console.log("⏳ Upgrading database...");
    await pool.query(sql);
    console.log("✅ Database upgrade successful! 'tasks' table created.");
  } catch (err) {
    console.error("❌ Error upgrading database:", err);
  } finally {
    await pool.end();
  }
}

run();