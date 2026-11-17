import pool from "@/lib/db";
import { HELP_TOPICS, HelpTopic, visibleHelpTopics } from "@/lib/help-catalog";
import { randomUUID } from "node:crypto";

type CustomRow = { id: string; parent_topic_id: string; title: string; category: string; summary: string; is_active: number };
let initialized = false;

async function ensureTable() {
    if (initialized) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS help_custom_topics (
        id VARCHAR(80) PRIMARY KEY,
        parent_topic_id VARCHAR(80) NOT NULL,
        title VARCHAR(180) NOT NULL,
        category VARCHAR(100) NOT NULL,
        summary VARCHAR(1000) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_help_custom_parent (parent_topic_id)
    )`);
    initialized = true;
}
function toTopic(row: CustomRow): HelpTopic | null {
    const parent = HELP_TOPICS.find((item) => item.id === row.parent_topic_id);
    if (!parent) return null;
    return { id: row.id, title: row.title, category: row.category, summary: row.summary,
        path: parent.path, roles: parent.roles, videoStatus: "coming_soon" };
}

export async function allHelpTopics(): Promise<HelpTopic[]> {
    await ensureTable();
    const [rows] = await pool.query("SELECT id,parent_topic_id,title,category,summary,is_active FROM help_custom_topics WHERE is_active = 1 ORDER BY title");
    return [...HELP_TOPICS, ...(rows as CustomRow[]).map(toTopic).filter((topic): topic is HelpTopic => topic !== null)];
}

export async function visibleHelpTopicsFromDb(role: string): Promise<HelpTopic[]> {
    const allowed = new Set(visibleHelpTopics(role).map((topic) => topic.id));
    return (await allHelpTopics()).filter((topic) => topic.id.startsWith("custom-") ? topic.roles.some((r) => r === role) : allowed.has(topic.id));
}

export async function validateHelpTopicFromDb(id: string): Promise<boolean> {
    return (await allHelpTopics()).some((topic) => topic.id === id);
}
export async function listCustomTopics() {
    await ensureTable();
    const [rows] = await pool.query("SELECT id,parent_topic_id,title,category,summary,is_active FROM help_custom_topics ORDER BY title");
    return rows as CustomRow[];
}
export async function createCustomTopic(input: { parentTopicId: string; title: string; category: string; summary: string }) {
    if (!HELP_TOPICS.some((item) => item.id === input.parentTopicId)) throw new Error("Select a valid existing Help topic for permissions.");
    if (!input.title.trim() || input.title.length > 180 || !input.category.trim() || input.category.length > 100 || input.summary.length > 1000) throw new Error("Invalid Help topic details.");
    await ensureTable();
    const id = "custom-" + randomUUID();
    await pool.query("INSERT INTO help_custom_topics (id,parent_topic_id,title,category,summary) VALUES (?,?,?,?,?)",
        [id, input.parentTopicId, input.title.trim(), input.category.trim(), input.summary.trim()]);
    return id;
}
export async function updateCustomTopic(input: { id: string; parentTopicId: string; title: string; category: string; summary: string }) {
    if (!/^custom-[a-f0-9-]{36}$/.test(input.id)) throw new Error("Invalid custom topic.");
    if (!HELP_TOPICS.some((item) => item.id === input.parentTopicId)) throw new Error("Select a valid existing Help topic.");
    if (!input.title.trim() || input.title.length > 180 || !input.category.trim() || input.category.length > 100 || input.summary.length > 1000) throw new Error("Invalid Help topic details.");
    await ensureTable();
    await pool.query("UPDATE help_custom_topics SET parent_topic_id=?,title=?,category=?,summary=? WHERE id=?",
        [input.parentTopicId,input.title.trim(),input.category.trim(),input.summary.trim(),input.id]);
}
export async function deleteCustomTopic(id: string) {
    if (!/^custom-[a-f0-9-]{36}$/.test(id)) throw new Error("Only custom topics can be deleted.");
    await ensureTable();
    // Prevent orphaned recordings and preserve their access constraints.
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM help_videos WHERE topic_id=?", [id]);
    if (Number((rows as Array<{count: number}>)[0]?.count) > 0) throw new Error("Remove or reassign videos before deleting this topic.");
    await pool.query("DELETE FROM help_custom_topics WHERE id=?", [id]);
}
