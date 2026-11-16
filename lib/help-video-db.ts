import pool from "@/lib/db";
import { HELP_TOPICS, visibleHelpTopics } from "@/lib/help-catalog";
import { randomUUID } from "node:crypto";
import { mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";

export type HelpVideo = {
    id: number;
    topic_id: string;
    title: string;
    description: string;
    filename: string;
    size_bytes: number;
    is_active: number;
    created_at: string;
};

const MAX_BYTES = 30 * 1024 * 1024;
let initialized = false;

async function ensureTable() {
    if (initialized) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS help_videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        topic_id VARCHAR(80) NOT NULL,
        title VARCHAR(180) NOT NULL,
        description TEXT NOT NULL,
        filename VARCHAR(100) NOT NULL UNIQUE,
        size_bytes INT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_help_topic_active (topic_id, is_active)
    )`);
    initialized = true;
}

export function videoStorageDirectory(): string {
    const directory = process.env.HELP_VIDEO_STORAGE_DIR?.trim();
    if (!directory || !path.isAbsolute(directory)) {
        throw new Error("HELP_VIDEO_STORAGE_DIR must be an absolute private directory outside public/.");
    }
    const resolved = path.resolve(directory);
    const publicDirectory = path.resolve(process.cwd(), "public");
    if (resolved === publicDirectory || resolved.startsWith(publicDirectory + path.sep)) {
        throw new Error("HELP_VIDEO_STORAGE_DIR must not be inside public/.");
    }
    return resolved;
}

function storageFilePath(filename: string) {
    if (!/^[a-f0-9-]{36}\.mp4$/.test(filename)) throw new Error("Invalid stored file name");
    return path.join(videoStorageDirectory(), filename);
}

export function validateHelpTopic(topicId: string) {
    return HELP_TOPICS.some((topic) => topic.id === topicId);
}

export async function listHelpVideos(): Promise<HelpVideo[]> {
    await ensureTable();
    const [rows] = await pool.query(
        "SELECT id, topic_id, title, description, filename, size_bytes, is_active, created_at FROM help_videos ORDER BY created_at DESC, id DESC"
    );
    return rows as HelpVideo[];
}

export async function getHelpVideo(id: number): Promise<HelpVideo | null> {
    await ensureTable();
    const [rows] = await pool.query(
        "SELECT id, topic_id, title, description, filename, size_bytes, is_active, created_at FROM help_videos WHERE id = ? LIMIT 1", [id]
    );
    return (rows as HelpVideo[])[0] || null;
}

export async function listVisibleHelpVideos(role: string) {
    const allowedTopics = new Set(visibleHelpTopics(role).map((topic) => topic.id));
    return (await listHelpVideos()).filter((video) => Boolean(video.is_active) && allowedTopics.has(video.topic_id));
}

export async function createHelpVideo(input: { topicId: string; title: string; description: string; file: File }) {
    if (!validateHelpTopic(input.topicId)) throw new Error("Invalid topic");
    if (!input.title || input.title.length > 180 || input.description.length > 2000) throw new Error("Invalid video title or description");
    if (input.file.size < 12 || input.file.size > MAX_BYTES) throw new Error("MP4 file must be between 12 bytes and 30MB.");
    if (!/\.mp4$/i.test(input.file.name) || !["video/mp4", "application/octet-stream", ""].includes(input.file.type)) {
        throw new Error("Only MP4 recordings are supported.");
    }
    const bytes = Buffer.from(await input.file.arrayBuffer());
    // Check ISO BMFF/MP4 file header, not the browser-provided MIME type alone.
    if (bytes.toString("ascii", 4, 8) !== "ftyp") throw new Error("File is not a valid MP4 container.");
    const directory = videoStorageDirectory();
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const filename = randomUUID() + ".mp4";
    const destination = storageFilePath(filename);
    const handle = await open(destination, "wx", 0o600);
    try {
        await handle.writeFile(bytes);
    } finally {
        await handle.close();
    }
    try {
        await ensureTable();
        const [result] = await pool.query(
            "INSERT INTO help_videos (topic_id,title,description,filename,size_bytes,is_active) VALUES (?,?,?,?,?,1)",
            [input.topicId, input.title, input.description, filename, bytes.length]
        );
        return (result as { insertId: number }).insertId;
    } catch (error) {
        await unlink(destination).catch(() => {});
        throw error;
    }
}

export async function updateHelpVideo(input: { id: number; topicId: string; title: string; description: string; active: boolean }) {
    if (!validateHelpTopic(input.topicId) || !input.title || input.title.length > 180 || input.description.length > 2000) {
        throw new Error("Invalid video details.");
    }
    await ensureTable();
    await pool.query("UPDATE help_videos SET topic_id=?,title=?,description=?,is_active=? WHERE id=?",
        [input.topicId,input.title,input.description,input.active ? 1 : 0,input.id]);
}

export async function deleteHelpVideo(id: number) {
    const video = await getHelpVideo(id);
    if (!video) return;
    // Deactivate first so nobody can view a deleted video during file removal.
    await pool.query("UPDATE help_videos SET is_active=0 WHERE id=?", [id]);
    await unlink(storageFilePath(video.filename)).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
    });
    await pool.query("DELETE FROM help_videos WHERE id=?", [id]);
}

export async function readHelpVideoRange(video: HelpVideo, start: number, end: number): Promise<Buffer> {
    const length = end - start + 1;
    const buffer = Buffer.alloc(length);
    const handle = await open(storageFilePath(video.filename), "r");
    try {
        const { bytesRead } = await handle.read(buffer, 0, length, start);
        if (bytesRead !== length) throw new Error("Incomplete video read.");
        return buffer;
    } finally {
        await handle.close();
    }
}
