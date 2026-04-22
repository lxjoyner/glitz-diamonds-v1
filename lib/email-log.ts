import fs from "fs";
import path from "path";

export type EmailLogStatus = "attempt" | "success" | "skipped" | "error";

export type EmailLogItem = {
    id: string;
    createdAt: string;
    channel: string;
    status: EmailLogStatus;
    to?: string | string[];
    subject?: string;
    reason?: string;
    details?: Record<string, unknown>;
};

const dataDir = path.join(process.cwd(), "data");
const emailLogFile = path.join(dataDir, "email-log.json");

function ensureEmailLogFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(emailLogFile)) {
        fs.writeFileSync(emailLogFile, "[]", "utf8");
    }
}

function readEmailLogs(): EmailLogItem[] {
    ensureEmailLogFile();
    const raw = fs.readFileSync(emailLogFile, "utf8");
    return JSON.parse(raw) as EmailLogItem[];
}

export function writeEmailLog(entry: Omit<EmailLogItem, "id" | "createdAt">) {
    const items = readEmailLogs();
    const record: EmailLogItem = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        ...entry,
    };
    items.unshift(record);
    fs.writeFileSync(emailLogFile, JSON.stringify(items, null, 2), "utf8");
}
