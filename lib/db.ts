import mysql from "mysql2/promise";

declare global {
    // eslint-disable-next-line no-var
    var mysqlPool: mysql.Pool | undefined;
}

const pool =
    global.mysqlPool ||
    mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 3306),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
    });

if (process.env.NODE_ENV !== "production") {
    global.mysqlPool = pool;
}

export default pool;