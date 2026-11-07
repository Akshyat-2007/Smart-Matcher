import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smart_study_matcher',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

let poolInstance = null;
let isConnected = false;

export function getPool() {
  if (!poolInstance) {
    try {
      poolInstance = mysql.createPool(dbConfig);
    } catch (err) {
      console.error('[DB] Failed to create MySQL pool:', err.message);
      throw err;
    }
  }
  return poolInstance;
}

export async function testConnection() {
  try {
    const pool = getPool();
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT 1 + 1 AS solution');
    conn.release();
    isConnected = true;
    console.log('[DB] Connected to MySQL successfully. Test query solution:', rows[0].solution);
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`[DB WARNING] Could not connect to MySQL at ${dbConfig.host}:${dbConfig.port} (${err.code || err.message}).`);
    console.warn('[DB WARNING] Make sure MySQL Server is running and credentials in .env are correct.');
    return false;
  }
}

export { isConnected };
export default getPool;
