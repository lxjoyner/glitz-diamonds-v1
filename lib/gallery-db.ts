import pool from "@/lib/db";

export type GalleryImageRecord = {
    id: number;
    caption: string;
    mime_type: string;
    is_active: number;
    created_at: string;
    updated_at: string;
};

let bootstrapped = false;

async function ensureGalleryTable() {
    if (bootstrapped) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS gallery_images (
            id INT AUTO_INCREMENT PRIMARY KEY,
            caption VARCHAR(255) NOT NULL,
            mime_type VARCHAR(64) NOT NULL,
            image_data LONGBLOB NOT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_gallery_active_created (is_active, created_at)
        )
    `);

    bootstrapped = true;
}

export async function createGalleryImage(input: {
    caption: string;
    mimeType: string;
    imageData: Buffer;
    isActive?: boolean;
}) {
    await ensureGalleryTable();

    const [result] = await pool.query(
        `
        INSERT INTO gallery_images (caption, mime_type, image_data, is_active)
        VALUES (?, ?, ?, ?)
        `,
        [input.caption, input.mimeType, input.imageData, input.isActive ? 1 : 0]
    );

    const insert = result as { insertId: number };

    return insert.insertId;
}

export async function getPublicGalleryImages() {
    await ensureGalleryTable();

    const [rows] = await pool.query(
        `
        SELECT id, caption, mime_type, is_active, created_at, updated_at
        FROM gallery_images
        WHERE is_active = 1
        ORDER BY created_at DESC
        `
    );

    return rows as GalleryImageRecord[];
}

export async function getAllGalleryImages() {
    await ensureGalleryTable();

    const [rows] = await pool.query(
        `
        SELECT id, caption, mime_type, is_active, created_at, updated_at
        FROM gallery_images
        ORDER BY created_at DESC
        `
    );

    return rows as GalleryImageRecord[];
}

export async function getGalleryImageBlobById(id: number) {
    await ensureGalleryTable();

    const [rows] = await pool.query(
        `
        SELECT id, caption, mime_type, image_data, is_active, updated_at
        FROM gallery_images
        WHERE id = ?
        LIMIT 1
        `,
        [id]
    );

    const record = (rows as Array<GalleryImageRecord & { image_data: Buffer }>)[0];
    return record ?? null;
}

export async function deleteGalleryImageById(id: number) {
    await ensureGalleryTable();

    await pool.query(
        `
        DELETE FROM gallery_images
        WHERE id = ?
        `,
        [id]
    );
}
