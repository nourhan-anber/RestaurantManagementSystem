import dotenv from 'dotenv';
dotenv.config();

import { pool } from './db/pool.js';
import app from './app.js';

const port = process.env.PORT || 5001;

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to PostgreSQL database');
  release();
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
