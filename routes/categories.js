import { Router } from 'express';
import pool from '../config/db.js';

const router = Router();


router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM part_categories ORDER BY category_name');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
