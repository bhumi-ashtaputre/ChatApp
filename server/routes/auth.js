import express from 'express';
import passport from 'passport';
import { signup, signin, getMe, logout, googleCallback } from '../controllers/authController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Email/password routes
router.post('/signup', signup);
router.post('/signin', signin);

// Google OAuth routes
// Step 1: redirect user to Google login page
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

// Step 2: Google redirects back here after login
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/login',
    session: false 
  }),
  googleCallback
);

// Protected routes
router.get('/me', authMiddleware, getMe);
router.post('/logout', logout);

export default router;