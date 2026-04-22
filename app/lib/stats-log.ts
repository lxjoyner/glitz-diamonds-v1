import fs from "fs";
import path from "path";
import { getChicagoDateKey } from "@/lib/timezone";

export type VisitLogItem = {
    id: string;
    createdAt: string;
    path: string;
};

const dataDir = path.join(process.cwd(), "data");
const visitLogFile = path.join(dataDir, "visit-log.json");

function ensureVisitFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    if (!fs.existsSync(visitLogFile)) {
        fs.writeFileSync(visitLogFile, "[]", "utf8");
    }
}

export function readVisitLogs(): VisitLogItem[] {
    ensureVisitFile();
    const raw = fs.readFileSync(visitLogFile, "utf8");
    return JSON.parse(raw) as VisitLogItem[];
}

export function writeVisitLog(item: VisitLogItem) {
    const items = readVisitLogs();
    items.unshift(item);
    fs.writeFileSync(visitLogFile, JSON.stringify(items, null, 2), "utf8");
}

export function getTodayVisitCount() {
    const today = getChicagoDateKey();
    return readVisitLogs().filter((item) => getChicagoDateKey(item.createdAt) === today).length;
}