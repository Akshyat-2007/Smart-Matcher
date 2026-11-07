import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'smart_study_matcher';

export async function initDatabase() {
  console.log(`[DB INIT] Connecting to MySQL at ${dbConfig.host}:${dbConfig.port} as '${dbConfig.user}'...`);
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('[DB INIT] Connection established.');

    console.log(`[DB INIT] Creating database '${DB_NAME}' if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.query(`USE \`${DB_NAME}\`;`);

    const schemaPath = path.resolve(__dirname, '../../schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[DB INIT] Executing schema.sql statements...');
    // Execute multiple statements
    await connection.query(schemaSql);
    console.log('[DB INIT] Schema successfully applied to MySQL database.');

    await connection.end();
    return true;
  } catch (err) {
    console.error('[DB INIT ERROR] Failed to initialize MySQL schema:', err.message);
    if (connection) await connection.end().catch(() => {});
    return false;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initDatabase().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
