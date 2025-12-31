require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'super-secret-key-change-this-later';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool(
  connectionString 
    ? { connectionString, ssl: { rejectUnauthorized: false } }
    : { user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT }
);

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

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Access denied: Admins only');
  }
  next();
};

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPass = await bcrypt.hash(password, 10);
    // First user registered becomes admin automatically, others are employees
    const userCount = await pool.query('SELECT count(*) FROM users');
    const role = userCount.rows[0].count === '0' ? 'admin' : 'employee';
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, avatar) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, avatar',
      [name, email, hashedPass, role, '👤']
    );
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
    if (!user) return res.status(400).send('User not found');
    
    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(403).send('Invalid password');

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) { res.status(500).send(err.message); }
});

// --- DATA ROUTES ---

app.get('/api/users', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT id, name, email, role, avatar FROM users ORDER BY id');
  res.json(result.rows);
});

// NEW: Update User Role (Admin Only)
app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  const { role } = req.body; // 'admin' or 'employee'
  const { id } = req.params;
  try {
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/projects', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM projects ORDER BY id');
  res.json(result.rows);
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  const { name, color } = req.body;
  const result = await pool.query('INSERT INTO projects (name, color, created_by) VALUES ($1, $2, $3) RETURNING *', [name, color, req.user.id]);
  res.json(result.rows[0]);
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  await pool.query('DELETE FROM time_entries WHERE project_id = $1', [req.params.id]);
  await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/entries', authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT te.*, p.name as project_name, p.color 
    FROM time_entries te
    JOIN projects p ON te.project_id = p.id
    WHERE te.user_id = $1 AND te.end_time IS NOT NULL
    ORDER BY te.start_time DESC LIMIT 50
  `, [req.user.id]);
  res.json(result.rows);
});

app.get('/api/entries/active', authenticateToken, async (req, res) => {
  const result = await pool.query('SELECT * FROM time_entries WHERE user_id = $1 AND end_time IS NULL', [req.user.id]);
  res.json(result.rows[0] || null);
});

app.post('/api/entries/start', authenticateToken, async (req, res) => {
  const { projectId } = req.body;
  const result = await pool.query('INSERT INTO time_entries (user_id, project_id, start_time) VALUES ($1, $2, NOW()) RETURNING *', [req.user.id, projectId]);
  res.json(result.rows[0]);
});

app.post('/api/entries/stop', authenticateToken, async (req, res) => {
  const activeTimer = await pool.query('SELECT id, start_time FROM time_entries WHERE user_id = $1 AND end_time IS NULL', [req.user.id]);
  if (activeTimer.rows.length === 0) return res.status(400).send('No timer');
  
  const entry = activeTimer.rows[0];
  const endTime = new Date();
  const duration = Math.floor((endTime - new Date(entry.start_time)) / 1000);
  
  const result = await pool.query('UPDATE time_entries SET end_time = $1, duration_seconds = $2 WHERE id = $3 RETURNING *', [endTime, duration, entry.id]);
  res.json(result.rows[0]);
});

app.post('/api/entries/manual', authenticateToken, async (req, res) => {
  const { projectId, start, end } = req.body;
  const startTime = new Date(start);
  const endTime = new Date(end);
  const duration = Math.floor((endTime - startTime) / 1000);
  const result = await pool.query('INSERT INTO time_entries (user_id, project_id, start_time, end_time, duration_seconds) VALUES ($1, $2, $3, $4, $5) RETURNING *', [req.user.id, projectId, startTime, endTime, duration]);
  res.json(result.rows[0]);
});

// Analytics (Admin or everyone? Prompt said admins only access the page, but let's secure the API too)
app.get('/api/analytics', authenticateToken, requireAdmin, async (req, res) => {
  const result = await pool.query(`
    SELECT u.id as user_id, u.name as user_name, p.id as project_id, p.name as project_name, p.color,
    ROUND(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600)::numeric, 2) as hours
    FROM time_entries te
    JOIN projects p ON te.project_id = p.id
    JOIN users u ON te.user_id = u.id
    WHERE te.end_time IS NOT NULL
    GROUP BY u.id, u.name, p.id, p.name, p.color
  `);
  res.json(result.rows);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Secure Backend running on port ${PORT}`));