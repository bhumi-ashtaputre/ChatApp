# ChatApp 💬

A full-stack real-time chat web application built with React, Node.js, Socket.io, and PostgreSQL.

## Features

- 🔐 Authentication — Email/password signup + Google OAuth
- 👥 Contact request system — Send, accept, or decline requests
- 💬 Real-time messaging — Instant messages via Socket.io
- 📎 Media sharing — Upload and share images and files
- ✓✓ Read receipts — Single, double, and blue ticks
- ⌨️ Typing indicators — See when someone is typing
- 👥 Group chats — Create groups with multiple contacts
- 🔔 Real-time notifications — Instant request notifications
- ⚙️ Profile settings — Edit your display name

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TailwindCSS |
| Backend | Node.js + Express |
| Real-time | Socket.io + Redis Pub/Sub |
| Database | PostgreSQL (Neon) |
| Cache | Redis (Upstash) |
| Media | Cloudinary |
| Auth | JWT + Google OAuth (Passport.js) |

## Project Structure
/ChatApp

/client        ← React + Vite frontend

/server        ← Node.js + Express backend

/shared        ← Shared Socket.io event constants

## Local Setup

### Prerequisites
- Node.js v18+
- A [Neon](https://neon.tech) PostgreSQL database
- An [Upstash](https://upstash.com) Redis instance
- A [Cloudinary](https://cloudinary.com) account
- Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com)

### Steps

1. Clone the repository
```bash
git clone https://github.com/bhumi-ashtaputre/ChatApp.git
cd ChatApp
```

2. Install server dependencies
```bash
cd server
npm install
```

3. Install client dependencies
```bash
cd ../client
npm install
```

4. Set up environment variables
```bash
cp .env.example .env
```
Fill in your credentials in the `.env` file.

5. Run the database migration
```bash
cd server
node db/migrate.js
```

6. Start the server
```bash
cd server
npm run dev
```

7. Start the client (in a new terminal)
```bash
cd client
npm run dev
```

8. Open [http://localhost:5173](http://localhost:5173)

## Architecture Highlights

**Real-time messaging** uses Socket.io with Redis Pub/Sub for fan-out across multiple server instances. When a message is sent, it's published to a Redis channel and delivered to all subscribers — ensuring messages reach users connected to different server pods.

**Contact request system** enforces a mutual acceptance model before any conversation can begin. A PostgreSQL transaction atomically creates the conversation and adds both participants when a request is accepted.

**Cursor-based pagination** is used for message history instead of offset pagination, ensuring consistent performance as message history grows.

**JWT authentication** is stored in httpOnly cookies to prevent XSS attacks. Google OAuth users are upserted on every login, allowing account linking if the same email is used for both signup methods.

## Environment Variables

See `.env.example` for all required variables.

---

Built by [Bhumi Ashtaputre](https://github.com/bhumi-ashtaputre)