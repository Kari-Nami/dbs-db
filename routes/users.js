import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();


router.get('/', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, display_name, avatar_url, bio, role, is_banned, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


router.get('/builders', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, display_name, avatar_url, role FROM users WHERE role IN ('builder', 'admin') ORDER BY display_name"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, display_name, avatar_url, bio, role, is_banned, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.put('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { display_name, avatar_url, bio } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET display_name = COALESCE($1, display_name), avatar_url = $2, bio = $3
       WHERE id = $4
       RETURNING id, email, display_name, avatar_url, bio, role, is_banned, created_at`,
      [display_name, avatar_url || null, bio || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.put('/:id/ban', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { is_banned } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET is_banned = $1 WHERE id = $2
       RETURNING id, email, display_name, role, is_banned`,
      [is_banned, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.put('/:id/role', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { role } = req.body;
    const { rows } = await pool.query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, email, display_name, role, is_banned`,
      [role, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.get('/:id/builder-profile', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM builder_profiles WHERE user_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Builder profile not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.put('/:id/builder-profile', authenticate, async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { business_name, registration_number, address, website, portfolio_url, years_of_experience, specialization } = req.body;
    const { rows } = await pool.query(
      `UPDATE builder_profiles SET business_name=$1, registration_number=$2, address=$3, website=$4, portfolio_url=$5, years_of_experience=$6, specialization=$7
       WHERE user_id = $8 RETURNING *`,
      [business_name, registration_number || null, address || null, website || null, portfolio_url || null, years_of_experience || null, specialization || null, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Builder profile not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
