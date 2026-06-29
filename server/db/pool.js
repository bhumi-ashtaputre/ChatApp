import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

// A "pool" is a collection of database connections
// Instead of opening and closing a new connection every time
// we keep a pool of connections ready to use
// Think of it like a pool of taxi cabs waiting for passengers
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Neon
  },
});

// Test the connection when the file is first loaded
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err); // removed .message to see full error
  } else {
    console.log('✅ Database connected successfully');
    release();
  }
});

export default pool;