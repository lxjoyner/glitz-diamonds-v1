import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import pool from "@/lib/db";

function requireAccess(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const payload = verifyAdminToken(token);
        if (!["admin", "treasurer"].includes(payload.role)) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
        return null;
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

async function ensureReceiptSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS transaction_receipts (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            transaction_key VARCHAR(120) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            mime_type VARCHAR(120) NOT NULL,
            file_size INT NOT NULL,
            file_data LONGBLOB NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_transaction_receipts_key (transaction_key)
        )
    `);
}

export async function POST(req: NextRequest, context: { params: Promise<{ key: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;

    await ensureReceiptSchema();
    const { key } = await context.params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
        return NextResponse.json({ success: false, error: "Receipt file is required." }, { status: 400 });
    }

    if (file.size > 6 * 1024 * 1024) {
        return NextResponse.json({ success: false, error: "Receipt file must be 6 MB or smaller." }, { status: 400 });
    }

    const allowed = ["image/jpeg","image/png","image/gif","image/tiff","image/bmp","application/pdf","image/heic","image/heif"];
    if (!allowed.includes(file.type)) {
        return NextResponse.json({ success: false, error: "Unsupported receipt file type." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await pool.execute(`
        INSERT INTO transaction_receipts (transaction_key, file_name, mime_type, file_size, file_data)
        VALUES (?, ?, ?, ?, ?)
    `, [key, file.name, file.type, file.size, buffer]);

    return NextResponse.json({ success: true });
}
