import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { buildDbConfig } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function initDatabase() {
  const baseConfig = buildDbConfig();
  const dbName = process.env.DB_NAME || 'smart_study_matcher';

  console.log(`[DB INIT] Connecting to MySQL at ${baseConfig.host || 'URI'} as '${baseConfig.user || 'user'}'...`);
  let connection;
  try {
    connection = await mysql.createConnection({
      ...baseConfig,
      multipleStatements: true
    });
    console.log('[DB INIT] Connection established.');

    // Attempt to create database if permitted, otherwise ignore permission error
    try {
      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await connection.query(`USE \`${dbName}\`;`);
    } catch (dbErr) {
      console.log(`[DB INIT] Notice on CREATE/USE DATABASE: ${dbErr.message} (Proceeding with default database).`);
    }

    const schemaPath = path.resolve(__dirname, '../../schema.sql');
    let schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Strip hardcoded CREATE DATABASE / USE statements so it targets the assigned database
    schemaSql = schemaSql
      .replace(/CREATE DATABASE[\s\S]*?;/gi, '')
      .replace(/USE\s+[`\w]+;/gi, '');

    console.log('[DB INIT] Executing schema table definitions...');
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
