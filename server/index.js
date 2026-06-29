import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

import './db/pool.js';
import redis from './db/redis.js';
import passport from './config/passport.js';
import pool from './db/pool.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import createContactRequestRouter from './routes/contactRequests.js';
import conversationRoutes from './routes/conversations.js';
import mediaRoutes from './routes/media.js';

import jwt from 'jsonwebtoken';
import { EVENTS } from '../shared/events.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact-requests', createContactRequestRouter(io));
app.use('/api/conversations', conversationRoutes);
app.use('/api/media', mediaRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'ChatApp server is running!' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Something went wrong on the server',
  });
});

// ── SOCKET.IO ──
io.use((socket, next) => {
  try {
    const cookie = socket.handshake.headers.cookie;
    if (!cookie) return next(new Error('Not authenticated'));

    // Parse the token from cookie string
    const tokenMatch = cookie.match(/token=([^;]+)/);
    if (!tokenMatch) return next(new Error('Not authenticated'));

    const decoded = jwt.verify(tokenMatch[1], process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  console.log(`✅ User connected: ${socket.userId}`);

  // Store socket ID in Redis so we can find it later
  await redis.set(`socket:${socket.userId}`, socket.id);

  // Update user status to online
  await redis.set(`user:${socket.userId}:status`, 'online', 'EX', 30);

  // Handle sending a message
  socket.on(EVENTS.MESSAGE_SEND, async (data) => {
    try {
      const { conversationId, content, clientMsgId } = data;

      // Verify user is a participant
      const participant = await pool.query(
        'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, socket.userId]
      );

      if (participant.rows.length === 0) return;

      // Save message to database
      // Save message to database
      const { mediaUrl, mediaType } = data;
      const result = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content, media_url, media_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, conversation_id, sender_id, content, media_url, media_type, created_at`,
        [conversationId, socket.userId, content || null, mediaUrl || null, mediaType || null]
      );

      const message = result.rows[0];

      // Get sender info
      const userResult = await pool.query(
        'SELECT name, avatar_url FROM users WHERE id = $1',
        [socket.userId]
      );

      const fullMessage = {
        ...message,
        sender_name: userResult.rows[0].name,
        sender_avatar: userResult.rows[0].avatar_url,
        clientMsgId,
        is_read: false,
      };

      // Send delivered confirmation back to sender
      socket.emit(EVENTS.MESSAGE_DELIVERED, {
        clientMsgId,
        messageId: message.id,
      });

      // Get all participants in this conversation
      const participants = await pool.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
        [conversationId]
      );

      // Send message to all other participants
      for (const p of participants.rows) {
        if (p.user_id !== socket.userId) {
          const recipientSocketId = await redis.get(`socket:${p.user_id}`);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit(EVENTS.MESSAGE_NEW, fullMessage);
          }
        }
      }
    } catch (err) {
      console.error('Message send error:', err);
    }
  });

  // Handle typing indicator
  socket.on(EVENTS.TYPING_START, async (data) => {
    const { conversationId } = data;
    const participants = await pool.query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
      [conversationId]
    );
    for (const p of participants.rows) {
      if (p.user_id !== socket.userId) {
        const recipientSocketId = await redis.get(`socket:${p.user_id}`);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit(EVENTS.TYPING_INDICATOR, {
            conversationId,
            userId: socket.userId,
            typing: true,
          });
        }
      }
    }
  });

  socket.on(EVENTS.TYPING_STOP, async (data) => {
    const { conversationId } = data;
    const participants = await pool.query(
      'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
      [conversationId]
    );
    for (const p of participants.rows) {
      if (p.user_id !== socket.userId) {
        const recipientSocketId = await redis.get(`socket:${p.user_id}`);
        if (recipientSocketId) {
          io.to(recipientSocketId).emit(EVENTS.TYPING_INDICATOR, {
            conversationId,
            userId: socket.userId,
            typing: false,
          });
        }
      }
    }
  });

  // Handle read receipts
  socket.on(EVENTS.MESSAGE_READ, async (data) => {
    try {
      const { messageId, conversationId } = data;

      // Insert read receipt
      await pool.query(
        `INSERT INTO message_reads (message_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [messageId, socket.userId]
      );

      // Get all participants to notify sender
      const participants = await pool.query(
        'SELECT user_id FROM conversation_participants WHERE conversation_id = $1',
        [conversationId]
      );

      // Notify all other participants that message was read
      for (const p of participants.rows) {
        if (p.user_id !== socket.userId) {
          const recipientSocketId = await redis.get(`socket:${p.user_id}`);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit(EVENTS.MESSAGE_SEEN, {
              messageId,
              conversationId,
              readBy: socket.userId,
            });
          }
        }
      }
    } catch (err) {
      console.error('Read receipt error:', err);
    }
  });

  // Handle presence ping
  socket.on(EVENTS.PRESENCE_PING, async () => {
    await redis.set(`user:${socket.userId}:status`, 'online', 'EX', 30);
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
    await redis.del(`socket:${socket.userId}`);
    await redis.set(`user:${socket.userId}:status`, 'offline');
    await pool.query(
      'UPDATE users SET last_seen = NOW() WHERE id = $1',
      [socket.userId]
    );
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});