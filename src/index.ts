import dotenv from 'dotenv';
import path from 'path';

// Load environment variables FIRST before any other imports
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import db from './db';

// Auto-migrate on startup (create tables if they don't exist)
async function ensureTablesExist() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                type TEXT,
                token_in TEXT,
                token_out TEXT,
                amount_in NUMERIC,
                status TEXT,
                created_at TIMESTAMP,
                last_error TEXT
            );
        `);
        console.log('[OK] Database tables verified/created');
    } catch (error) {
        console.error('[WARN] Database migration warning:', error);
    }
}

ensureTablesExist().then(() => {
    import('./server');
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
