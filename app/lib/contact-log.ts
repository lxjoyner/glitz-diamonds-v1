import fs from "fs";
import path from "path";

export type ContactLogItem = {
    id: string;
    createdAt: string;
    name: string;
    email: string;
    message: string;
    ip?: string;
};

const dataDir = path.join(process.cwd(), "data");
const logFile = path.join(dataDir, "contact-messages.json");

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(logFile)) {
        fs.writeFileSync(logFile, "[]", "utf8");
    }
}

export function readContactLogs(): ContactLogItem[] {
    ensureFile();
    const raw = fs.readFileSync(logFile, "utf8");
    return JSON.parse(raw) as ContactLogItem[];
}

export function writeContactLog(item: ContactLogItem) {
    const items = readContactLogs();
    items.unshift(item);
    fs.writeFileSync(logFile, JSON.stringify(items, null, 2), "utf8");
}

export function getTodayContactCount() {
    const today = new Date().toISOString().slice(0, 10);
    return readContactLogs().filter((item) => item.createdAt.startsWith(today)).length;
}