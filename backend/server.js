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

// --- EMAIL ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});
const sendWelcomeEmail = async (email, name) => {
  if (!process.env.EMAIL_USER) return;
  try { await transporter.sendMail({ from: '"TimeApp" <no-reply@timeapp.com>', to: email, subject: "Welcome!", html: `<h2>Welcome ${name}</h2>` }); } catch(e){ console.log(e); }
};

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => { if (err) return res.sendStatus(403); req.user = user; next(); });
};

// --- AUTH ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const r = await pool.query('INSERT INTO users (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.name, req.body.email, hashed, '👤']);
    sendWelcomeEmail(req.body.email, req.body.name);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).send(e.message); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const u = (await pool.query('SELECT * FROM users WHERE email = $1', [req.body.email])).rows[0];
    if (!u || !(await bcrypt.compare(req.body.password, u.password))) return res.status(403).send('Invalid');
    res.json({ token: jwt.sign({ id: u.id, role: u.role }, JWT_SECRET), user: u });
  } catch (e) { res.status(500).send(e.message); }
});

// --- USERS ---
app.get('/api/users', authenticateToken, async (req, res) => { res.json((await pool.query('SELECT id, name, email, role, avatar FROM users ORDER BY id')).rows); });
app.put('/api/users/profile', authenticateToken, async (req, res) => { res.json((await pool.query('UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING *', [req.body.name, req.body.email, req.user.id])).rows[0]); });
app.put('/api/users/password', authenticateToken, async (req, res) => {
  const u = (await pool.query('SELECT password FROM users WHERE id=$1', [req.user.id])).rows[0];
  if (!(await bcrypt.compare(req.body.currentPassword, u.password))) return res.sendStatus(403);
  await pool.query('UPDATE users SET password=$1 WHERE id=$2', [await bcrypt.hash(req.body.newPassword, 10), req.user.id]);
  res.json({ success: true });
});
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await pool.query('DELETE FROM time_entries WHERE user_id=$1', [req.params.id]);
  await pool.query('DELETE FROM weekly_assignments WHERE user_id=$1', [req.params.id]); // Clean up assignments
  await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});
app.put('/api/users/:id/role', authenticateToken, async (req, res) => { if(req.user.role!=='admin') return res.sendStatus(403); await pool.query('UPDATE users SET role=$1 WHERE id=$2', [req.body.role, req.params.id]); res.json({success:true}); });

// --- PROJECTS & TASKS ---
app.get('/api/projects', authenticateToken, async (req, res) => {
  const p = await pool.query('SELECT * FROM projects ORDER BY id');
  const t = await pool.query('SELECT * FROM tasks ORDER BY id');
  res.json({ projects: p.rows, tasks: t.rows });
});
app.post('/api/projects', authenticateToken, async (req, res) => { res.json((await pool.query('INSERT INTO projects (name, color, created_by) VALUES ($1, $2, $3) RETURNING *', [req.body.name, req.body.color, req.user.id])).rows[0]); });
app.delete('/api/projects/:id', authenticateToken, async (req, res) => { await pool.query('DELETE FROM tasks WHERE project_id=$1', [req.params.id]); await pool.query('DELETE FROM time_entries WHERE project_id=$1', [req.params.id]); await pool.query('DELETE FROM weekly_assignments WHERE project_id=$1', [req.params.id]); await pool.query('DELETE FROM projects WHERE id=$1', [req.params.id]); res.json({success:true}); });
app.put('/api/projects/:id', authenticateToken, async (req, res) => { await pool.query('UPDATE projects SET name=$1, color=$2 WHERE id=$3', [req.body.name, req.body.color, req.params.id]); res.json({success:true}); });

app.post('/api/tasks', authenticateToken, async (req, res) => { res.json((await pool.query('INSERT INTO tasks (name, project_id) VALUES ($1, $2) RETURNING *', [req.body.name, req.body.projectId])).rows[0]); });
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => { await pool.query('DELETE FROM time_entries WHERE task_id=$1', [req.params.id]); await pool.query('DELETE FROM weekly_assignments WHERE task_id=$1', [req.params.id]); await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]); res.json({success:true}); });

// --- WEEKLY ASSIGNMENTS (NEW) ---
app.get('/api/assignments', authenticateToken, async (req, res) => {
  // Get assignments for the logged-in user
  const q = `
    SELECT wa.id, wa.project_id, wa.task_id, p.name as project_name, p.color, t.name as task_name 
    FROM weekly_assignments wa
    JOIN projects p ON wa.project_id = p.id
    LEFT JOIN tasks t ON wa.task_id = t.id
    WHERE wa.user_id = $1 ORDER BY wa.created_at DESC
  `;
  res.json((await pool.query(q, [req.user.id])).rows);
});

app.get('/api/assignments/all', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  // Get ALL assignments for Admin view
  const q = `
    SELECT wa.id, u.name as user_name, p.name as project_name, t.name as task_name 
    FROM weekly_assignments wa
    JOIN users u ON wa.user_id = u.id
    JOIN projects p ON wa.project_id = p.id
    LEFT JOIN tasks t ON wa.task_id = t.id
    ORDER BY wa.created_at DESC
  `;
  res.json((await pool.query(q)).rows);
});

app.post('/api/assignments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { userId, projectId, taskId } = req.body;
  // Prevent duplicates
  const exists = await pool.query('SELECT * FROM weekly_assignments WHERE user_id=$1 AND project_id=$2 AND (task_id=$3 OR (task_id IS NULL AND $3 IS NULL))', [userId, projectId, taskId || null]);
  if (exists.rows.length > 0) return res.status(400).send("Assignment already exists");
  
  await pool.query('INSERT INTO weekly_assignments (user_id, project_id, task_id) VALUES ($1, $2, $3)', [userId, projectId, taskId || null]);
  res.json({ success: true });
});

app.delete('/api/assignments/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  await pool.query('DELETE FROM weekly_assignments WHERE id=$1', [req.params.id]);
  res.json({ success: true });
});

// --- ENTRIES (Updated for Minutes & Duration) ---
app.get('/api/entries', authenticateToken, async (req, res) => {
  res.json((await pool.query(`SELECT te.*, p.name as project_name, p.color, t.name as task_name FROM time_entries te JOIN projects p ON te.project_id = p.id LEFT JOIN tasks t ON te.task_id = t.id WHERE te.user_id = $1 AND te.end_time IS NOT NULL ORDER BY te.start_time DESC LIMIT 50`, [req.user.id])).rows);
});
app.get('/api/entries/active', authenticateToken, async (req, res) => { res.json((await pool.query('SELECT * FROM time_entries WHERE user_id = $1 AND end_time IS NULL', [req.user.id])).rows[0] || null); });
app.post('/api/entries/start', authenticateToken, async (req, res) => { res.json((await pool.query('INSERT INTO time_entries (user_id, project_id, task_id, start_time) VALUES ($1, $2, $3, NOW()) RETURNING *', [req.user.id, req.body.projectId, req.body.taskId || null])).rows[0]); });
app.post('/api/entries/stop', authenticateToken, async (req, res) => { 
  const entry = (await pool.query('SELECT * FROM time_entries WHERE user_id=$1 AND end_time IS NULL', [req.user.id])).rows[0];
  if(!entry) return res.sendStatus(400);
  const dur = Math.floor((new Date() - new Date(entry.start_time)) / 1000);
  res.json((await pool.query('UPDATE time_entries SET end_time=NOW(), duration_seconds=$1 WHERE id=$2 RETURNING *', [dur, entry.id])).rows[0]);
});

// UPDATED: Manual Entry (Supports Minutes)
app.post('/api/entries/manual', authenticateToken, async (req, res) => {
  const { projectId, taskId, minutes, date } = req.body;
  const durationSeconds = parseInt(minutes) * 60;
  
  // Calculate timestamps relative to the selected date
  const end = new Date(date);
  end.setHours(12, 0, 0, 0); // Default to noon
  const start = new Date(end.getTime() - durationSeconds * 1000);

  const result = await pool.query('INSERT INTO time_entries (user_id, project_id, task_id, start_time, end_time, duration_seconds) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [req.user.id, projectId, taskId || null, start, end, durationSeconds]);
  res.json(result.rows[0]);
});

app.delete('/api/entries/:id', authenticateToken, async (req, res) => { await pool.query('DELETE FROM time_entries WHERE id=$1', [req.params.id]); res.json({ success: true }); });

// --- ANALYTICS ---
app.get('/api/analytics', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);
  const { start, end, projectIds } = req.query;
  let q = `SELECT u.name as user_name, p.name as project_name, p.color, t.name as task_name, SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600) as hours FROM time_entries te JOIN projects p ON te.project_id = p.id JOIN users u ON te.user_id = u.id LEFT JOIN tasks t ON te.task_id = t.id WHERE te.end_time IS NOT NULL`;
  const p = []; let i = 1;
  if (start) { q += ` AND te.start_time >= $${i++}`; p.push(start); }
  if (end) { q += ` AND te.start_time < ($${i++}::date + 1)`; p.push(end); }
  if (projectIds) { q += ` AND p.id = ANY($${i++}::int[])`; p.push(projectIds.split(',')); }
  q += ` GROUP BY u.name, p.name, p.color, t.name`;
  res.json((await pool.query(q, p)).rows);
});

// --- DB SETUP ROUTE (KEEP FOR UPGRADE) ---
app.get('/setup-db', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE);
      ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL;
      CREATE TABLE IF NOT EXISTS weekly_assignments (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE, task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL, created_at TIMESTAMP DEFAULT NOW());
    `);
    res.send("✅ Database successfully upgraded!");
  } catch (err) { res.send("❌ Error: " + err.message); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend on ${PORT}`));