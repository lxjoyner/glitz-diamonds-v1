import pool from "@/lib/db";

export type GalleryImageRecord = {
    id: number;
    caption: string;
    mime_type: string;
    is_active: number;
    sort_order: number;
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
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_gallery_active_sort (is_active, sort_order, created_at)
        )
    `);

    await pool.query(`
        ALTER TABLE gallery_images
        ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0
    `);

    await pool.query(`
        UPDATE gallery_images
        SET sort_order = id
        WHERE sort_order = 0
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
        INSERT INTO gallery_images (caption, mime_type, image_data, is_active, sort_order)
        VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM gallery_images AS g))
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
        SELECT id, caption, mime_type, is_active, sort_order, created_at, updated_at
        FROM gallery_images
        WHERE is_active = 1
        ORDER BY sort_order ASC, created_at DESC
        `
    );

    return rows as GalleryImageRecord[];
}

export async function getAllGalleryImages() {
    await ensureGalleryTable();

    const [rows] = await pool.query(
        `
        SELECT id, caption, mime_type, is_active, sort_order, created_at, updated_at
        FROM gallery_images
        ORDER BY sort_order ASC, created_at DESC
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

export async function updateGalleryImageOrder(imageIds: number[]) {
    await ensureGalleryTable();

    if (imageIds.length === 0) return;

    const values = imageIds.map((id, idx) => `WHEN ${Number(id)} THEN ${idx + 1}`).join(" ");
    const ids = imageIds.map((id) => Number(id)).join(",");

    await pool.query(`
        UPDATE gallery_images
        SET sort_order = CASE id ${values} END
        WHERE id IN (${ids})
    `);
}
