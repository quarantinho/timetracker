require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-key-change-this-later';

const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT }
);

// --- EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendWelcomeEmail = async (email, name) => {
  if (!process.env.EMAIL_USER) return console.log('Skipping email: No credentials.');
  try {
    await transporter.sendMail({
      from: '"TimeApp Team" <no-reply@timeapp.com>',
      to: email,
      subject: "Welcome to TimeApp! 🚀",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4f46e5;">Welcome, ${name}!</h2>
          <p>Thanks for joining TimeApp. Your account is ready.</p>
        </div>
      `
    });
  } catch (err) { console.error("Email error:", err); }
};

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPass = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO users (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, avatar', [name, email, hashedPass, '👤']);
    sendWelcomeEmail(email, name);
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).send('Email already exists');
    res.status(500).send(err.message);
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(403).send('Invalid credentials');
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) { res.status(500).send(err.message); }
});

// --- USER MANAGEMENT ---
app.get('/api/users', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, role, avatar FROM users ORDER BY id');
  res.json(result.rows);
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Admin only');
  try {
    await pool.query('DELETE FROM time_entries WHERE user_id = $1', [req.params.id]);
    await pool.query('UPDATE projects SET created_by = $1 WHERE created_by = $2', [req.user.id, req.params.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Admin only');
  try {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [req.body.role, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, avatar', [req.body.name, req.body.email, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/users/password', authenticateToken, async (req, res) => {
  try {
    const user = (await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id])).rows[0];
    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) return res.status(403).send('Incorrect password');
    const hashed = await bcrypt.hash(req.body.newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// --- PROJECTS & TASKS ---
app.get('/api/projects', authenticateToken, async (req, res) => {
  const pRes = await pool.query('SELECT * FROM projects ORDER BY id');
  const tRes = await pool.query('SELECT * FROM tasks ORDER BY id');
  res.json({ projects: pRes.rows, tasks: tRes.rows });
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('INSERT INTO projects (name, color, created_by) VALUES ($1, $2, $3) RETURNING *', [req.body.name, req.body.color, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('UPDATE projects SET name = $1, color = $2 WHERE id = $3 RETURNING *', [req.body.name, req.body.color, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE project_id = $1', [req.params.id]);
    await pool.query('DELETE FROM time_entries WHERE project_id = $1', [req.params.id]);
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// NEW: Task Routes
app.post('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('INSERT INTO tasks (name, project_id) VALUES ($1, $2) RETURNING *', [req.body.name, req.body.projectId]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM time_entries WHERE task_id = $1', [req.params.id]);
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// --- TIME ENTRIES (With Sub-task Support) ---
app.get('/api/entries', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT te.*, p.name as project_name, p.color, t.name as task_name
      FROM time_entries te
      JOIN projects p ON te.project_id = p.id
      LEFT JOIN tasks t ON te.task_id = t.id
      WHERE te.user_id = $1 AND te.end_time IS NOT NULL 
      ORDER BY te.start_time DESC LIMIT 50`, [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/entries/active', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM time_entries WHERE user_id = $1 AND end_time IS NULL', [req.user.id]);
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/entries/start', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('INSERT INTO time_entries (user_id, project_id, task_id, start_time) VALUES ($1, $2, $3, NOW()) RETURNING *', [req.user.id, req.body.projectId, req.body.taskId || null]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/entries/stop', authenticateToken, async (req, res) => {
  try {
    const active = await pool.query('SELECT * FROM time_entries WHERE user_id = $1 AND end_time IS NULL', [req.user.id]);
    if (!active.rows.length) return res.status(400).send('No timer');
    const entry = active.rows[0];
    const duration = Math.floor((new Date() - new Date(entry.start_time)) / 1000);
    const result = await pool.query('UPDATE time_entries SET end_time = NOW(), duration_seconds = $1 WHERE id = $2 RETURNING *', [duration, entry.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/entries/manual', authenticateToken, async (req, res) => {
  const { projectId, taskId, start, end } = req.body;
  const s = new Date(start); const e = new Date(end);
  const dur = Math.floor((e - s) / 1000);
  try {
    const result = await pool.query('INSERT INTO time_entries (user_id, project_id, task_id, start_time, end_time, duration_seconds) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.user.id, projectId, taskId || null, s, e, dur]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/entries/:id', authenticateToken, async (req, res) => {
  const { projectId, taskId, start, end } = req.body;
  const s = new Date(start); const e = new Date(end);
  const dur = Math.floor((e - s) / 1000);
  try {
    const result = await pool.query('UPDATE time_entries SET project_id = $1, task_id = $2, start_time = $3, end_time = $4, duration_seconds = $5 WHERE id = $6 RETURNING *', [projectId, taskId || null, s, e, dur, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/entries/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM time_entries WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// --- ANALYTICS (Deep Fetch) ---
app.get('/api/analytics', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Admin only');
  const { start, end, projectIds } = req.query;
  
  let query = `
    SELECT u.id as user_id, u.name as user_name, 
           p.id as project_id, p.name as project_name, p.color,
           t.id as task_id, t.name as task_name,
           ROUND(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600)::numeric, 2) as hours
    FROM time_entries te
    JOIN projects p ON te.project_id = p.id
    JOIN users u ON te.user_id = u.id
    LEFT JOIN tasks t ON te.task_id = t.id
    WHERE te.end_time IS NOT NULL
  `;
  
  const params = []; let paramIdx = 1;
  if (start) { query += ` AND te.start_time >= $${paramIdx++}`; params.push(start); }
  if (end) { query += ` AND te.start_time < ($${paramIdx++}::date + 1)`; params.push(end); }
  if (projectIds) { const ids = projectIds.split(',').map(id => parseInt(id)).filter(n => !isNaN(n)); if (ids.length > 0) { query += ` AND p.id = ANY($${paramIdx++}::int[])`; params.push(ids); } }
  
  query += ` GROUP BY u.id, u.name, p.id, p.name, p.color, t.id, t.name`;
  
  try { const result = await pool.query(query, params); res.json(result.rows); } 
  catch (err) { res.status(500).send(err.message); }
});

// --- TEMPORARY: DB UPGRADE ROUTE ---
app.get('/setup-db', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE
      );
      ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
    `);
    res.send("✅ Database successfully upgraded! You can now use Sub-tasks.");
  } catch (err) {
    res.send("❌ Error: " + err.message);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));