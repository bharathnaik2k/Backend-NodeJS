
const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: {
        rejectUnauthorized: false,
    }
});
// Create tables automatically if they don't exist
const createTables = async () => {
    const userTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(userTableQuery);
        // Refresh Token ಸೇವ್ ಮಾಡಲು ಹೊಸ ಕಾಲಮ್ ಸೇರಿಸುತ್ತಿದ್ದೇವೆ (ಇದ್ದರೆ ಬಿಡುತ್ತದೆ)
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;");
        console.log("Users table is ready!");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
};

createTables();

module.exports = pool;