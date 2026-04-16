import bcrypt from "bcryptjs";
import pool from "../lib/db";

async function main() {
    const username = "admin";
    const plainPassword = "ChangeThisStrongPassword123!";

    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await pool.execute(
        `
        INSERT INTO admins (username, password_hash, role)
        VALUES (?, ?, ?)
        `,
        [username, passwordHash, "admin"]
    );

    console.log("Admin user created.");
    process.exit(0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});