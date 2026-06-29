import express from 'express';
import pool from '../db/pool.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Search users by name or email
// ILIKE means case-insensitive search in PostgreSQL
router.get('/search', authMiddleware, async (req, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.user.userId;

    if (!q || q.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchTerm = `%${q.trim()}%`;

    const result = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        -- Check if a contact request exists between these two users
        cr.status as request_status,
        cr.id as request_id,
        cr.from_user
       FROM users u
       LEFT JOIN contact_requests cr ON (
         (cr.from_user = $1 AND cr.to_user = u.id) OR
         (cr.from_user = u.id AND cr.to_user = $1)
       )
       WHERE 
         (u.name ILIKE $2 OR u.email ILIKE $2)
         AND u.id != $1
       LIMIT 20`,
      [userId, searchTerm]
    );

    // Format the results
    const users = result.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      requestStatus: user.request_status || null,
      requestId: user.request_id || null,
      iSentRequest: user.from_user === userId,
    }));

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// Update current user profile
router.patch('/me', authMiddleware, async (req, res, next) => {
  try {
    const { name } = req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }

    const result = await pool.query(
      `UPDATE users SET name = $1 WHERE id = $2
       RETURNING id, name, email, avatar_url, last_seen, created_at`,
      [name.trim(), userId]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

export default router;