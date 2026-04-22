import pool from "@/lib/db";

export type IdeaStatus = "draft" | "submitted";

export type IdeaRecord = {
    id: number;
    created_by_user_id: number;
    title: string;
    details: string;
    category: string;
    purpose: string;
    location_type: string;
    location_text: string;
    budget_range: string;
    time_commitment: string;
    group_size: number;
    preferred_start_date: string;
    preferred_end_date: string;
    file_name: string | null;
    file_mime_type: string | null;
    status: IdeaStatus;
    created_at: string;
    updated_at: string;
};

let bootstrapped = false;

export async function ensureIdeasActivitiesTables() {
    if (bootstrapped) return;

    await pool.query(`
        CREATE TABLE IF NOT EXISTS ideas_activities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            created_by_user_id INT NOT NULL,
            title VARCHAR(150) NOT NULL,
            details TEXT NOT NULL,
            category VARCHAR(64) NOT NULL,
            purpose VARCHAR(64) NOT NULL,
            location_type VARCHAR(32) NOT NULL,
            location_text VARCHAR(255) NOT NULL,
            budget_range VARCHAR(32) NOT NULL,
            time_commitment VARCHAR(64) NOT NULL,
            group_size INT NOT NULL,
            preferred_start_date DATE NOT NULL,
            preferred_end_date DATE NOT NULL,
            file_name VARCHAR(255) NULL,
            file_mime_type VARCHAR(80) NULL,
            file_data LONGBLOB NULL,
            status VARCHAR(16) NOT NULL DEFAULT 'draft',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_ideas_created_by (created_by_user_id),
            INDEX idx_ideas_status (status),
            INDEX idx_ideas_category (category)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS idea_votes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idea_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_idea_vote (idea_id, user_id),
            INDEX idx_votes_idea (idea_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS idea_favorites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idea_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_idea_favorite (idea_id, user_id),
            INDEX idx_favorites_idea (idea_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS idea_polls (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idea_id INT NOT NULL,
            question VARCHAR(255) NOT NULL,
            created_by_user_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS idea_poll_options (
            id INT AUTO_INCREMENT PRIMARY KEY,
            poll_id INT NOT NULL,
            option_label VARCHAR(150) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS idea_poll_votes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            poll_id INT NOT NULL,
            option_id INT NOT NULL,
            user_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_poll_user (poll_id, user_id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS idea_poll_email_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            poll_id INT NOT NULL,
            user_id INT NOT NULL,
            token_hash VARCHAR(128) NOT NULL,
            used_at DATETIME NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_poll_user_email_token (poll_id, user_id),
            UNIQUE KEY uniq_poll_email_token_hash (token_hash),
            INDEX idx_poll_email_token_expires (expires_at)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS scheduled_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idea_id INT NOT NULL,
            title VARCHAR(150) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            location_text VARCHAR(255) NOT NULL,
            created_by_user_id INT NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_scheduled_dates (start_date, end_date)
        )
    `);

    bootstrapped = true;
}

export async function createIdeaActivity(input: {
    createdByUserId: number;
    title: string;
    details: string;
    category: string;
    purpose: string;
    locationType: string;
    location: string;
    budgetRange: string;
    timeCommitment: string;
    groupSize: number;
    preferredStartDate: string;
    preferredEndDate: string;
    fileName?: string | null;
    fileMimeType?: string | null;
    fileData?: Buffer | null;
    status: IdeaStatus;
}) {
    await ensureIdeasActivitiesTables();

    const [result] = await pool.query(
        `
        INSERT INTO ideas_activities (
            created_by_user_id, title, details, category, purpose, location_type, location_text, budget_range,
            time_commitment, group_size, preferred_start_date, preferred_end_date, file_name, file_mime_type, file_data, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
            input.createdByUserId,
            input.title,
            input.details,
            input.category,
            input.purpose,
            input.locationType,
            input.location,
            input.budgetRange,
            input.timeCommitment,
            input.groupSize,
            input.preferredStartDate,
            input.preferredEndDate,
            input.fileName || null,
            input.fileMimeType || null,
            input.fileData || null,
            input.status,
        ]
    );

    return Number((result as { insertId?: number }).insertId || 0);
}

export async function getIdeaFileById(ideaId: number) {
    await ensureIdeasActivitiesTables();
    const [rows] = await pool.query(
        `SELECT file_name, file_mime_type, file_data FROM ideas_activities WHERE id = ? LIMIT 1`,
        [ideaId]
    );

    return (rows as Array<{ file_name: string | null; file_mime_type: string | null; file_data: Buffer | null }>)[0] ?? null;
}

export async function getIdeaById(ideaId: number) {
    await ensureIdeasActivitiesTables();
    const [rows] = await pool.query(`SELECT id, title FROM ideas_activities WHERE id = ? LIMIT 1`, [ideaId]);
    return (rows as Array<{ id: number; title: string }>)[0] ?? null;
}

export async function getIdeasAndActivities(currentUserId: number) {
    await ensureIdeasActivitiesTables();

    const [rows] = await pool.query(
        `
        SELECT
            i.*,
            COALESCE(v.vote_count, 0) AS vote_count,
            COALESCE(f.favorite_count, 0) AS favorite_count,
            CASE WHEN uv.user_id IS NULL THEN 0 ELSE 1 END AS has_upvoted,
            CASE WHEN uf.user_id IS NULL THEN 0 ELSE 1 END AS has_favorited,
            u.full_name AS created_by_name
        FROM ideas_activities i
        LEFT JOIN users u ON u.id = i.created_by_user_id
        LEFT JOIN (
            SELECT idea_id, COUNT(*) AS vote_count
            FROM idea_votes
            GROUP BY idea_id
        ) v ON v.idea_id = i.id
        LEFT JOIN (
            SELECT idea_id, COUNT(*) AS favorite_count
            FROM idea_favorites
            GROUP BY idea_id
        ) f ON f.idea_id = i.id
        LEFT JOIN idea_votes uv ON uv.idea_id = i.id AND uv.user_id = ?
        LEFT JOIN idea_favorites uf ON uf.idea_id = i.id AND uf.user_id = ?
        ORDER BY i.created_at DESC
        `,
        [currentUserId, currentUserId]
    );

    return rows as Array<IdeaRecord & {
        vote_count: number;
        favorite_count: number;
        has_upvoted: number;
        has_favorited: number;
        created_by_name: string | null;
    }>;
}

export async function toggleIdeaVote(ideaId: number, userId: number) {
    await ensureIdeasActivitiesTables();
    const [existingRows] = await pool.query(`SELECT id FROM idea_votes WHERE idea_id = ? AND user_id = ? LIMIT 1`, [ideaId, userId]);
    const existing = (existingRows as Array<{ id: number }>)[0];

    if (existing) {
        await pool.query(`DELETE FROM idea_votes WHERE id = ?`, [existing.id]);
        return false;
    }

    await pool.query(`INSERT INTO idea_votes (idea_id, user_id) VALUES (?, ?)`, [ideaId, userId]);
    return true;
}

export async function toggleIdeaFavorite(ideaId: number, userId: number) {
    await ensureIdeasActivitiesTables();
    const [existingRows] = await pool.query(`SELECT id FROM idea_favorites WHERE idea_id = ? AND user_id = ? LIMIT 1`, [ideaId, userId]);
    const existing = (existingRows as Array<{ id: number }>)[0];

    if (existing) {
        await pool.query(`DELETE FROM idea_favorites WHERE id = ?`, [existing.id]);
        return false;
    }

    await pool.query(`INSERT INTO idea_favorites (idea_id, user_id) VALUES (?, ?)`, [ideaId, userId]);
    return true;
}

export async function createPollForIdea(input: {
    ideaId: number;
    question: string;
    options: string[];
    createdByUserId: number;
}) {
    await ensureIdeasActivitiesTables();

    const [pollResult] = await pool.query(
        `INSERT INTO idea_polls (idea_id, question, created_by_user_id) VALUES (?, ?, ?)`,
        [input.ideaId, input.question, input.createdByUserId]
    );

    const pollId = Number((pollResult as { insertId?: number }).insertId || 0);

    for (const option of input.options) {
        await pool.query(`INSERT INTO idea_poll_options (poll_id, option_label) VALUES (?, ?)`, [pollId, option]);
    }

    return pollId;
}

export async function voteInPoll(pollId: number, optionId: number, userId: number) {
    await ensureIdeasActivitiesTables();
    await pool.query(`DELETE FROM idea_poll_votes WHERE poll_id = ? AND user_id = ?`, [pollId, userId]);
    await pool.query(`INSERT INTO idea_poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)`, [pollId, optionId, userId]);
}

export async function getPollWithOptionsForValidation(pollId: number) {
    await ensureIdeasActivitiesTables();
    const [pollRows] = await pool.query(`SELECT id, idea_id, question FROM idea_polls WHERE id = ? LIMIT 1`, [pollId]);
    const poll = (pollRows as Array<{ id: number; idea_id: number; question: string }>)[0];

    if (!poll) return null;

    const [optionRows] = await pool.query(
        `SELECT id, option_label FROM idea_poll_options WHERE poll_id = ? ORDER BY created_at ASC`,
        [pollId]
    );

    return {
        ...poll,
        options: optionRows as Array<{ id: number; option_label: string }>,
    };
}

export async function upsertPollEmailToken(input: {
    pollId: number;
    userId: number;
    tokenHash: string;
    expiresAt: string;
}) {
    await ensureIdeasActivitiesTables();
    await pool.query(
        `
        INSERT INTO idea_poll_email_tokens (poll_id, user_id, token_hash, expires_at, used_at)
        VALUES (?, ?, ?, ?, NULL)
        ON DUPLICATE KEY UPDATE
            token_hash = VALUES(token_hash),
            expires_at = VALUES(expires_at),
            used_at = NULL
        `,
        [input.pollId, input.userId, input.tokenHash, input.expiresAt]
    );
}

export async function getPollEmailTokenByHash(tokenHash: string) {
    await ensureIdeasActivitiesTables();
    const [rows] = await pool.query(
        `
        SELECT id, poll_id, user_id, used_at, expires_at
        FROM idea_poll_email_tokens
        WHERE token_hash = ?
        LIMIT 1
        `,
        [tokenHash]
    );

    return (rows as Array<{ id: number; poll_id: number; user_id: number; used_at: string | null; expires_at: string }>)[0] ?? null;
}

export async function markPollEmailTokenUsed(tokenId: number) {
    await ensureIdeasActivitiesTables();
    await pool.query(`UPDATE idea_poll_email_tokens SET used_at = NOW() WHERE id = ?`, [tokenId]);
}

export async function getIdeaPolls(ideaId: number, userId: number) {
    await ensureIdeasActivitiesTables();

    const [pollRows] = await pool.query(`SELECT id, idea_id, question, created_by_user_id, created_at FROM idea_polls WHERE idea_id = ? ORDER BY created_at DESC`, [ideaId]);
    const polls = pollRows as Array<{ id: number; idea_id: number; question: string; created_by_user_id: number; created_at: string }>;

    const out = [];
    for (const poll of polls) {
        const [optionsRows] = await pool.query(
            `
            SELECT
                o.id,
                o.option_label,
                COALESCE(v.vote_count, 0) AS vote_count,
                CASE WHEN uv.option_id IS NULL THEN 0 ELSE 1 END AS selected_by_user
            FROM idea_poll_options o
            LEFT JOIN (
                SELECT option_id, COUNT(*) AS vote_count
                FROM idea_poll_votes
                GROUP BY option_id
            ) v ON v.option_id = o.id
            LEFT JOIN idea_poll_votes uv ON uv.option_id = o.id AND uv.poll_id = ? AND uv.user_id = ?
            WHERE o.poll_id = ?
            ORDER BY o.created_at ASC
            `,
            [poll.id, userId, poll.id]
        );

        out.push({
            ...poll,
            options: optionsRows,
        });
    }

    return out;
}

export async function createScheduledEvent(input: {
    ideaId: number;
    title: string;
    startDate: string;
    endDate: string;
    location: string;
    createdByUserId: number;
}) {
    await ensureIdeasActivitiesTables();

    await pool.query(
        `INSERT INTO scheduled_events (idea_id, title, start_date, end_date, location_text, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [input.ideaId, input.title, input.startDate, input.endDate, input.location, input.createdByUserId]
    );
}

export async function getScheduledEvents() {
    await ensureIdeasActivitiesTables();
    const [rows] = await pool.query(`SELECT id, idea_id, title, start_date, end_date, location_text, created_at FROM scheduled_events ORDER BY start_date ASC`);
    return rows as Array<{
        id: number;
        idea_id: number;
        title: string;
        start_date: string;
        end_date: string;
        location_text: string;
        created_at: string;
    }>;
}

export async function deleteIdeaActivityById(ideaId: number) {
    await ensureIdeasActivitiesTables();
    await pool.query(`DELETE FROM scheduled_events WHERE idea_id = ?`, [ideaId]);
    await pool.query(
        `DELETE v FROM idea_poll_votes v INNER JOIN idea_polls p ON p.id = v.poll_id WHERE p.idea_id = ?`,
        [ideaId]
    );
    await pool.query(
        `DELETE o FROM idea_poll_options o INNER JOIN idea_polls p ON p.id = o.poll_id WHERE p.idea_id = ?`,
        [ideaId]
    );
    await pool.query(`DELETE FROM idea_poll_email_tokens WHERE poll_id IN (SELECT id FROM idea_polls WHERE idea_id = ?)`, [ideaId]);
    await pool.query(`DELETE FROM idea_polls WHERE idea_id = ?`, [ideaId]);
    await pool.query(`DELETE FROM idea_votes WHERE idea_id = ?`, [ideaId]);
    await pool.query(`DELETE FROM idea_favorites WHERE idea_id = ?`, [ideaId]);
    const [result] = await pool.query(`DELETE FROM ideas_activities WHERE id = ?`, [ideaId]);
    return Number((result as { affectedRows?: number }).affectedRows || 0);
}

export async function deleteScheduledEventById(eventId: number) {
    await ensureIdeasActivitiesTables();
    const [result] = await pool.query(`DELETE FROM scheduled_events WHERE id = ?`, [eventId]);
    return Number((result as { affectedRows?: number }).affectedRows || 0);
}

export async function deletePollById(pollId: number) {
    await ensureIdeasActivitiesTables();
    await pool.query(`DELETE FROM idea_poll_votes WHERE poll_id = ?`, [pollId]);
    await pool.query(`DELETE FROM idea_poll_options WHERE poll_id = ?`, [pollId]);
    await pool.query(`DELETE FROM idea_poll_email_tokens WHERE poll_id = ?`, [pollId]);
    const [result] = await pool.query(`DELETE FROM idea_polls WHERE id = ?`, [pollId]);
    return Number((result as { affectedRows?: number }).affectedRows || 0);
}
