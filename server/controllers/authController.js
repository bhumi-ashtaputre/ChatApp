import pool from '../db/pool.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// Helper function to issue a JWT cookie
// We use this in both signup, signin, and Google OAuth
const issueToken = (res, user) => {
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  // Set the token as an httpOnly cookie
  // httpOnly means JavaScript in the browser cannot read it
  // This protects against XSS attacks
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'none',
    secure: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

// SIGN UP — create a new account with email and password
export const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Check if a user with this email already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ 
        error: 'An account with this email already exists.' 
      });
    }

    // Hash the password before storing it
    // Never store plain text passwords
    const password_hash = await bcrypt.hash(
      password, 
      parseInt(process.env.BCRYPT_SALT_ROUNDS)
    );

    // Insert the new user into the database
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, name, email, avatar_url, created_at`,
      [name, email, password_hash]
    );

    const user = result.rows[0];

    // Issue JWT cookie
    issueToken(res, user);

    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
};

// SIGN IN — login with email and password
export const signin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    // Case 1: No account found with this email
    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'No account found with this email.' 
      });
    }

    const user = result.rows[0];

    // Case 2: User signed up with Google, has no password
    if (!user.password_hash) {
      return res.status(401).json({ 
        error: 'This account uses Google Sign In. Please continue with Google.' 
      });
    }

    // Case 3: Wrong password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Incorrect password.' 
      });
    }

    // All good — issue JWT cookie
    issueToken(res, user);

    // Don't send password_hash back to the client
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (err) {
    next(err);
  }
};

// GET ME — return the currently logged in user
export const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, avatar_url, last_seen, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// LOGOUT — clear the JWT cookie
export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully.' });
};

// GOOGLE OAUTH CALLBACK — called by passport after Google login
export const googleCallback = async (req, res) => {
  try {
    issueToken(res, req.user);
    res.redirect(process.env.CLIENT_URL);
  } catch (err) {
    res.redirect(`${process.env.CLIENT_URL}/login?error=oauth_failed`);
  }
};