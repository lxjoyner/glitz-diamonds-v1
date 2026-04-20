const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
require("dotenv").config({ path: ".env.local" });

async function main() {
    try {
        const username = "admin";
        const plainPassword = "ChangeThisStrongPassword123!";

        const passwordHash = await bcrypt.hash(plainPassword, 12);

        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT || 3306),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        await pool.execute(
            `
            INSERT INTO admins (username, password_hash, role, is_active)
            VALUES (?, ?, ?, ?)
            `,
            [username, passwordHash, "admin", 1]
        );

        console.log("✅ Admin created successfully!");
        console.log("Username:", username);
        console.log("Password:", plainPassword);

        await pool.end();
    } catch (err) {
        console.error("❌ Error creating admin:", err);
    }
}

main();