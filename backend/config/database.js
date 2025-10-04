import { Pool } from 'pg';

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'spaceapps',
  user: process.env.DB_USER || 'testadmin',
  password: process.env.DB_PASSWORD,
  max: 20,
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});
