import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isCloudDb =
  process.env.DB_SSL === 'true' ||
  Boolean(process.env.DB_HOST && (
    process.env.DB_HOST.includes('tidbcloud.com') ||
    process.env.DB_HOST.includes('aivencloud.com') ||
    process.env.DB_HOST.includes('cleardb.net') ||
    process.env.DB_HOST.includes('psdb.cloud')
  ));

export const sslConfig = isCloudDb
  ? { minVersion: 'TLSv1.2', rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'false' ? false : true }
  : undefined;

export function buildDbConfig() {
  const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (connectionUri) {
    return {
      uri: connectionUri,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ...(sslConfig ? { ssl: sslConfig } : {})
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'smart_study_matcher',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...(sslConfig ? { ssl: sslConfig } : {})
  };
}

let poolInstance = null;
let isConnected = false;

export function getPool() {
  if (!poolInstance) {
    try {
      const config = buildDbConfig();
      poolInstance = mysql.createPool(config);
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
    const config = buildDbConfig();
    console.warn(`[DB WARNING] Could not connect to MySQL at ${config.host || 'URI'}:${config.port || ''} (${err.code || err.message}).`);
    console.warn('[DB WARNING] Make sure MySQL Server is running and credentials in .env are correct.');
    return false;
  }
}

export { isConnected };
export default getPool;
