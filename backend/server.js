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

// --- EMAIL CONFIGURATION (MOCK / REAL) ---
// For production, you would replace these with real SMTP credentials (e.g., SendGrid, Gmail)
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email', // Uses Ethereal for testing (fake emails)
  port: 587,
  auth: { user: 'ethereal.user', pass: 'ethereal.pass' } 
});

const sendWelcomeEmail = async (email, name) => {
  console.log(`📨 [MOCK EMAIL] To: ${email} | Subject: Welcome! | Body: Hi ${name}, welcome to TimeApp!`);
  // In a real app with SMTP set up, you would uncomment this:
  /*
  await transporter.sendMail({
    from: '"TimeApp" <no-reply@timeapp.com>',
    to: email,
    subject: "Welcome to TimeApp!",
    text: `Hi ${name},\n\nThanks for joining TimeApp. We are glad to have you on board.\n\n- The Team`
  });
  */
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
    
    // Send Confirmation Email
    sendWelcomeEmail(email, name).catch(console.error);

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

// Admin Delete User
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Admin only');
  try {
    // Cascade delete: entries first, then projects, then user
    await pool.query('DELETE FROM time_entries WHERE user_id = $1', [req.params.id]);
    await pool.query('DELETE FROM projects WHERE created_by = $1', [req.params.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// Update Role (Admin)
app.put('/api/users/:id/role', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Admin only');
  try {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role', [req.body.role, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// --- SETTINGS (Update Profile) ---

// Update Profile Info
app.put('/api/users/profile', authenticateToken, async (req, res) => {
  const { name, email } = req.body;
  try {
    const result = await pool.query('UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, avatar', [name, email, req.user.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send(err.message); }
});

// Change Password
app.put('/api/users/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];
    
    if (!(await bcrypt.compare(currentPassword, user.password))) return res.status(403).send('Current password incorrect');
    
    const hashedPass = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPass, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// --- PROJECT & ENTRY ROUTES (Unchanged) ---
app.get('/api/projects', authenticateToken, async (req, res) => { const result = await pool.query('SELECT * FROM projects ORDER BY id'); res.json(result.rows); });
app.post('/api/projects', authenticateToken, async (req, res) => { try { const result = await pool.query('INSERT INTO projects (name, color, created_by) VALUES ($1, $2, $3) RETURNING *', [req.body.name, req.body.color, req.user.id]); res.json(result.rows[0]); } catch (err) { res.status(500).send(err.message); } });
app.put('/api/projects/:id', authenticateToken, async (req, res) => { try { const result = await pool.query('UPDATE projects SET name = $1, color = $2 WHERE id = $3 RETURNING *', [req.body.name, req.body.color, req.params.id]); res.json(result.rows[0]); } catch (err) { res.status(500).send(err.message); } });
app.delete('/api/projects/:id', authenticateToken, async (req, res) => { try { await pool.query('DELETE FROM time_entries WHERE project_id = $1', [req.params.id]); await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); } });
app.get('/api/entries', authenticateToken, async (req, res) => { try { const result = await pool.query(`SELECT te.*, p.name as project_name, p.color FROM time_entries te JOIN projects p ON te.project_id = p.id WHERE te.user_id = $1 AND te.end_time IS NOT NULL ORDER BY te.start_time DESC LIMIT 50`, [req.user.id]); res.json(result.rows); } catch (err) { res.status(500).send(err.message); } });
app.get('/api/entries/active', authenticateToken, async (req, res) => { try { const result = await pool.query('SELECT * FROM time_entries WHERE user_id = $1 AND end_time IS NULL', [req.user.id]); res.json(result.rows[0] || null); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/entries/start', authenticateToken, async (req, res) => { try { const result = await pool.query('INSERT INTO time_entries (user_id, project_id, start_time) VALUES ($1, $2, NOW()) RETURNING *', [req.user.id, req.body.projectId]); res.json(result.rows[0]); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/entries/stop', authenticateToken, async (req, res) => { try { const active = await pool.query('SELECT id, start_time FROM time_entries WHERE user_id = $1 AND end_time IS NULL', [req.user.id]); if (active.rows.length === 0) return res.status(400).send('No timer'); const entry = active.rows[0]; const endTime = new Date(); const duration = Math.floor((endTime - new Date(entry.start_time)) / 1000); const result = await pool.query('UPDATE time_entries SET end_time = $1, duration_seconds = $2 WHERE id = $3 RETURNING *', [endTime, duration, entry.id]); res.json(result.rows[0]); } catch (err) { res.status(500).send(err.message); } });
app.post('/api/entries/manual', authenticateToken, async (req, res) => { const { projectId, start, end } = req.body; const s = new Date(start); const e = new Date(end); const dur = Math.floor((e - s) / 1000); try { const result = await pool.query('INSERT INTO time_entries (user_id, project_id, start_time, end_time, duration_seconds) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.user.id, projectId, s, e, dur]); res.json(result.rows[0]); } catch (err) { res.status(500).send(err.message); } });
app.put('/api/entries/:id', authenticateToken, async (req, res) => { const { projectId, start, end } = req.body; const s = new Date(start); const e = new Date(end); const dur = Math.floor((e - s) / 1000); try { const result = await pool.query('UPDATE time_entries SET project_id = $1, start_time = $2, end_time = $3, duration_seconds = $4 WHERE id = $5 RETURNING *', [projectId, s, e, dur, req.params.id]); res.json(result.rows[0]); } catch (err) { res.status(500).send(err.message); } });
app.delete('/api/entries/:id', authenticateToken, async (req, res) => { try { await pool.query('DELETE FROM time_entries WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).send(err.message); } });

// --- ANALYTICS ---
app.get('/api/analytics', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).send('Admin only');
  const { start, end, projectIds } = req.query;
  let query = `SELECT u.id as user_id, u.name as user_name, p.id as project_id, p.name as project_name, p.color, ROUND(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600)::numeric, 2) as hours FROM time_entries te JOIN projects p ON te.project_id = p.id JOIN users u ON te.user_id = u.id WHERE te.end_time IS NOT NULL`;
  const params = []; let paramIdx = 1;
  if (start) { query += ` AND te.start_time >= $${paramIdx++}`; params.push(start); }
  if (end) { query += ` AND te.start_time < ($${paramIdx++}::date + 1)`; params.push(end); }
  if (projectIds) { const ids = projectIds.split(',').map(id => parseInt(id)).filter(n => !isNaN(n)); if (ids.length > 0) { query += ` AND p.id = ANY($${paramIdx++}::int[])`; params.push(ids); } }
  query += ` GROUP BY u.id, u.name, p.id, p.name, p.color`;
  try { const result = await pool.query(query, params); res.json(result.rows); } catch (err) { res.status(500).send(err.message); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));