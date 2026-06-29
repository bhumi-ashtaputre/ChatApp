import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import pool from '../db/pool.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const avatar_url = profile.photos[0]?.value;
      const google_id = profile.id;

      // Upsert — insert if new, update if existing
      // This handles the case where user signed up with email first
      // then tries to login with Google using same email
      const result = await pool.query(
        `INSERT INTO users (google_id, name, email, avatar_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) 
         DO UPDATE SET 
           google_id = EXCLUDED.google_id,
           avatar_url = EXCLUDED.avatar_url
         RETURNING id, name, email, avatar_url`,
        [google_id, name, email, avatar_url]
      );

      return done(null, result.rows[0]);
    } catch (err) {
      return done(err, null);
    }
  }
));

export default passport;