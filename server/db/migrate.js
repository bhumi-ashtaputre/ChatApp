import pool from './pool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// These two lines are needed to get the current folder path
// In modern JavaScript modules, __dirname doesn't exist by default
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrate = async () => {
  try {
    // Read the SQL file
    const sql = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf8'
    );
    
    // Run it against the database
    await pool.query(sql);
    console.log('✅ Database tables created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
};

migrate();