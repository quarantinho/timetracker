require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database Connection (Handles both Local and Cloud URLs)
const connectionString = process.env.DATABASE_URL;
const pool = new Pool(
  connectionString 
    ? { 
        connectionString, 
        ssl: { rejectUnauthorized: false } 
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
      }
);

// --- ROUTES ---

// 1. Get Users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// 2. Get Projects
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM projects ORDER BY id');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// 3. Create Project
app.post('/api/projects', async (req, res) => {
  const { name, color } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, color) VALUES ($1, $2) RETURNING *',
      [name, color]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// 4. Delete Project
app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM time_entries WHERE project_id = $1', [id]);
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// 5. Get History for User
app.get('/api/entries/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(`
      SELECT te.*, p.name as project_name, p.color 
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      WHERE te.user_id = $1 AND te.end_time IS NOT NULL
      ORDER BY te.start_time DESC LIMIT 50
    `, [userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

// 6. Start Timer
app.post('/api/entries/start', async (req, res) => {
  const { projectId, userId } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO time_entries (user_id, project_id, start_time) VALUES ($1, $2, NOW()) RETURNING *',
      [userId, projectId]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// 7. Stop Timer
app.post('/api/entries/stop', async (req, res) => {
  const { userId } = req.body;
  try {
    const activeTimer = await pool.query(
      'SELECT id, start_time FROM time_entries WHERE user_id = $1 AND end_time IS NULL ORDER BY start_time DESC LIMIT 1',
      [userId]
    );
    
    if (activeTimer.rows.length === 0) return res.status(400).send('No active timer');

    const entry = activeTimer.rows[0];
    const endTime = new Date();
    const duration = Math.floor((endTime - new Date(entry.start_time)) / 1000);

    const result = await pool.query(
      'UPDATE time_entries SET end_time = $1, duration_seconds = $2 WHERE id = $3 RETURNING *',
      [endTime, duration, entry.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// 8. Manual Entry
app.post('/api/entries/manual', async (req, res) => {
  const { userId, projectId, start, end } = req.body;
  try {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const duration = Math.floor((endTime - startTime) / 1000);

    if (duration < 0) return res.status(400).send('End time must be after start time');

    const result = await pool.query(
      'INSERT INTO time_entries (user_id, project_id, start_time, end_time, duration_seconds) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, projectId, startTime, endTime, duration]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// 9. Check Active Timer
app.get('/api/entries/active/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM time_entries WHERE user_id = $1 AND end_time IS NULL',
      [userId]
    );
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).send('Server Error'); }
});

// 10. Analytics (Data Aggregation)
app.get('/api/analytics', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id as user_id, 
        u.name as user_name, 
        p.id as project_id, 
        p.name as project_name, 
        p.color,
        ROUND(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600)::numeric, 2) as hours
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      JOIN users u ON te.user_id = u.id
      WHERE te.end_time IS NOT NULL
      GROUP BY u.id, u.name, p.id, p.name, p.color
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));