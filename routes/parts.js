import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();


router.get('/', async (req, res, next) => {
  try {
    const { category_id } = req.query;
    let query = 'SELECT p.*, pc.category_name FROM parts p JOIN part_categories pc ON p.category_id = pc.id WHERE p.is_active = true';
    const params = [];

    if (category_id) {
      params.push(category_id);
      query += ` AND p.category_id = $${params.length}`;
    }

    query += ' ORDER BY pc.category_name, p.name';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


router.get('/all', authenticate, requireRole('admin'), async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, pc.category_name
       FROM parts p JOIN part_categories pc ON p.category_id = pc.id
       ORDER BY pc.category_name, p.name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});


router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, pc.category_name
       FROM parts p JOIN part_categories pc ON p.category_id = pc.id
       WHERE p.id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Part not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { category_id, name, brand, model, specifications, price, image_url, is_active } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO parts (category_id, name, brand, model, specifications, price, image_url, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [category_id, name, brand, model, JSON.stringify(specifications), price, image_url || null, is_active !== false, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.put('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { category_id, name, brand, model, specifications, price, image_url, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE parts SET category_id=$1, name=$2, brand=$3, model=$4, specifications=$5, price=$6, image_url=$7, is_active=$8
       WHERE id = $9 RETURNING *`,
      [category_id, name, brand, model, JSON.stringify(specifications), price, image_url || null, is_active !== false, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Part not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});


router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM parts WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Part not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
