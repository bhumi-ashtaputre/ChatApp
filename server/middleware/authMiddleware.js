import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// This middleware runs before any protected route
// It checks if the request has a valid JWT cookie
// Think of it as the security guard at the door
const authMiddleware = (req, res, next) => {
  try {
    // Read the token from the cookie
    const token = req.cookies.token;

    // If no token, the user is not logged in
    if (!token) {
      return res.status(401).json({ 
        error: 'Not authenticated. Please log in.' 
      });
    }

    // Verify the token is valid and not expired
    // jwt.verify throws an error if the token is invalid
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user info to the request
    // Now any route after this middleware can access req.user
    req.user = decoded;

    // Call next() to move on to the actual route
    next();
  } catch (err) {
    return res.status(401).json({ 
      error: 'Invalid or expired token. Please log in again.' 
    });
  }
};

export default authMiddleware;