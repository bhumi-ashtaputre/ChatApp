import express from 'express';
import pool from '../db/pool.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all conversations for the logged in user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT 
        c.id,
        c.is_group,
        c.name as group_name,
        -- Get the other participant's info for DMs
        u.id as other_user_id,
        u.name as other_user_name,
        u.email as other_user_email,
        u.avatar_url as other_user_avatar,
        -- Get the last message
        m.content as last_message,
        m.created_at as last_message_time,
        -- Count unread messages
        COUNT(DISTINCT msg2.id) FILTER (
          WHERE msg2.id NOT IN (
            SELECT message_id FROM message_reads WHERE user_id = $1
          )
          AND msg2.sender_id != $1
        ) as unread_count
       FROM conversations c
       JOIN conversation_participants cp ON cp.conversation_id = c.id
         AND cp.user_id = $1
       -- Get other participant for DMs
       LEFT JOIN conversation_participants cp2 ON cp2.conversation_id = c.id
         AND cp2.user_id != $1
       LEFT JOIN users u ON u.id = cp2.user_id AND c.is_group = false
       -- Get last message
       LEFT JOIN messages m ON m.id = (
         SELECT id FROM messages
         WHERE conversation_id = c.id
         ORDER BY created_at DESC
         LIMIT 1
       )
       -- Count unread
       LEFT JOIN messages msg2 ON msg2.conversation_id = c.id
       GROUP BY c.id, c.is_group, c.name, u.id, u.name, u.email, u.avatar_url, m.content, m.created_at
       ORDER BY m.created_at DESC NULLS LAST`,
      [userId]
    );

    const conversations = result.rows.map(row => ({
      id: row.id,
      isGroup: row.is_group,
      name: row.is_group ? row.group_name : row.other_user_name,
      email: row.other_user_email,
      otherUserId: row.other_user_id,
      avatarUrl: row.other_user_avatar,
      lastMessage: row.last_message || 'No messages yet',
      lastMessageTime: row.last_message_time,
      unreadCount: parseInt(row.unread_count) || 0,
    }));

    res.json({ conversations });
  } catch (err) {
    next(err);
  }
});

// Get messages for a conversation
router.get('/:id/messages', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { cursor, limit = 20 } = req.query;

    // Make sure user is a participant
    const participant = await pool.query(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation.' });
    }

    // Cursor based pagination
    let query = `
      SELECT 
        m.id,
        m.content,
        m.media_url,
        m.media_type,
        m.created_at,
        m.sender_id,
        u.name as sender_name,
        u.avatar_url as sender_avatar,
        EXISTS (
          SELECT 1 FROM message_reads 
          WHERE message_id = m.id AND user_id != $2
        ) as is_read
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE m.conversation_id = $1
    `;

    const params = [id, userId];

    if (cursor) {
      query += ` AND m.created_at < $3`;
      params.push(cursor);
    }

    query += ` ORDER BY m.created_at DESC LIMIT ${parseInt(limit)}`;

    const result = await pool.query(query, params);
    const messages = result.rows.reverse();

    const nextCursor = result.rows.length === parseInt(limit)
      ? result.rows[result.rows.length - 1].created_at
      : null;

    res.json({ messages, nextCursor });
  } catch (err) {
    next(err);
  }
});

// Create a group conversation
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, memberIds } = req.body;
    const userId = req.user.userId;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    if (!memberIds || memberIds.length < 2) {
      return res.status(400).json({ error: 'A group needs at least 2 other members.' });
    }

    // Include the creator in the group
    const allMembers = [...new Set([userId, ...memberIds])];

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create the conversation
      const convoResult = await client.query(
        `INSERT INTO conversations (is_group, name, created_by)
         VALUES (true, $1, $2) RETURNING id`,
        [name.trim(), userId]
      );

      const conversationId = convoResult.rows[0].id;

      // Add all members
      for (const memberId of allMembers) {
        await client.query(
          'INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)',
          [conversationId, memberId]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({ conversationId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

export default router;