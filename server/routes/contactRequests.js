import express from 'express';
import pool from '../db/pool.js';
import authMiddleware from '../middleware/authMiddleware.js';
import redis from '../db/redis.js';
import { EVENTS } from '../../shared/events.js';

const createRouter = (io) => {
  const router = express.Router();

  // Send a contact request
  router.post('/', authMiddleware, async (req, res, next) => {
    try {
      const fromUser = req.user.userId;
      const { toUserId } = req.body;

      if (fromUser === toUserId) {
        return res.status(400).json({ error: 'You cannot send a request to yourself.' });
      }

      // Check if request already exists in either direction
      const existing = await pool.query(
        `SELECT id FROM contact_requests 
         WHERE (from_user = $1 AND to_user = $2) 
            OR (from_user = $2 AND to_user = $1)`,
        [fromUser, toUserId]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'A request already exists between these users.' });
      }

      // Insert the request
      const result = await pool.query(
        `INSERT INTO contact_requests (from_user, to_user) 
         VALUES ($1, $2) RETURNING *`,
        [fromUser, toUserId]
      );

      // Get sender info to include in notification
      const senderResult = await pool.query(
        'SELECT name, email FROM users WHERE id = $1',
        [fromUser]
      );

      const sender = senderResult.rows[0];

      // Emit real-time notification to recipient
      const recipientSocketId = await redis.get(`socket:${toUserId}`);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit(EVENTS.REQUEST_INCOMING, {
          id: result.rows[0].id,
          fromUserId: fromUser,
          name: sender.name,
          email: sender.email,
        });
      }

      res.status(201).json({ request: result.rows[0] });
    } catch (err) {
      next(err);
    }
  });

  // Accept or decline a request
  router.patch('/:id', authMiddleware, async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.userId;

      const requestResult = await pool.query(
        'SELECT * FROM contact_requests WHERE id = $1 AND to_user = $2 AND status = $3',
        [id, userId, 'pending']
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Request not found.' });
      }

      const request = requestResult.rows[0];

      await pool.query(
        'UPDATE contact_requests SET status = $1 WHERE id = $2',
        [status, id]
      );

      if (status === 'accepted') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');

          const convoResult = await client.query(
            'INSERT INTO conversations (is_group, created_by) VALUES (false, $1) RETURNING id',
            [request.from_user]
          );

          const conversationId = convoResult.rows[0].id;

          await client.query(
            'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2), ($1, $3)',
            [conversationId, request.from_user, request.to_user]
          );

          await client.query('COMMIT');

          // Notify the requester that request was accepted
          const requesterSocketId = await redis.get(`socket:${request.from_user}`);
          if (requesterSocketId) {
            io.to(requesterSocketId).emit(EVENTS.REQUEST_ACCEPTED, {
              conversationId,
              acceptedBy: userId,
            });
          }

          res.json({ status: 'accepted', conversationId });
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } else {
        // Notify requester that request was declined
        const requesterSocketId = await redis.get(`socket:${request.from_user}`);
        if (requesterSocketId) {
          io.to(requesterSocketId).emit(EVENTS.REQUEST_DECLINED, {
            declinedBy: userId,
          });
        }
        res.json({ status: 'declined' });
      }
    } catch (err) {
      next(err);
    }
  });

  // Get all pending requests
  router.get('/pending', authMiddleware, async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const result = await pool.query(
        `SELECT 
          cr.id,
          cr.from_user,
          cr.created_at,
          u.name,
          u.email,
          u.avatar_url
         FROM contact_requests cr
         JOIN users u ON u.id = cr.from_user
         WHERE cr.to_user = $1 AND cr.status = 'pending'
         ORDER BY cr.created_at DESC`,
        [userId]
      );

      res.json({ requests: result.rows });
    } catch (err) {
      next(err);
    }
  });

  // Get all accepted contacts
  router.get('/accepted', authMiddleware, async (req, res, next) => {
    try {
      const userId = req.user.userId;

      const result = await pool.query(
        `SELECT 
          u.id,
          u.name,
          u.email,
          u.avatar_url
         FROM contact_requests cr
         JOIN users u ON (
           CASE 
             WHEN cr.from_user = $1 THEN u.id = cr.to_user
             ELSE u.id = cr.from_user
           END
         )
         WHERE (cr.from_user = $1 OR cr.to_user = $1)
           AND cr.status = 'accepted'
         ORDER BY u.name`,
        [userId]
      );

      res.json({ contacts: result.rows });
    } catch (err) {
      next(err);
    }
  });

  return router;
};

export default createRouter;