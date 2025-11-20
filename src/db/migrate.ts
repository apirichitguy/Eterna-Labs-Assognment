import db from './index';

async function migrate() {
    try {
        console.log('Running database migration...');

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

        console.log('✅ Migration completed successfully!');
        console.log('Orders table created.');

        // Verify table exists
        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'orders';
        `);

        if (result.rows.length > 0) {
            console.log('✅ Verified: orders table exists');
        } else {
            console.log('⚠️ Warning: orders table not found after creation');
        }

        await db.pool.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        await db.pool.end();
        process.exit(1);
    }
}

migrate();
