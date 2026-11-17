import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAdminSettings } from "@/lib/admin-settings-db";
import { getHelpVideo, readHelpVideoRange } from "@/lib/help-video-db";
import { visibleHelpTopicsFromDb } from "@/lib/help-custom-topics-db";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return new NextResponse(null, { status: 401 });
    let role = "";
    try { role = verifyAdminToken(token).role; }
    catch { return new NextResponse(null, { status: 401 }); }

    const { id: rawId } = await context.params;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id <= 0) return new NextResponse(null, { status: 404 });

    try {
        const settings = await getAdminSettings();
        if (Number(settings.help_enabled) === 0) return new NextResponse(null, { status: 403 });
        const video = await getHelpVideo(id);
        if (!video || !video.is_active || !(await visibleHelpTopicsFromDb(role)).some((topic) => topic.id === video.topic_id)) {
            return new NextResponse(null, { status: 404 });
        }
        const size = video.size_bytes;
        const range = req.headers.get("range");
        let start = 0;
        let end = size - 1;
        if (range) {
            const match = /^bytes=(\d*)-(\d*)$/.exec(range);
            if (!match || (!match[1] && !match[2])) {
                return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
            }
            if (!match[1]) {
                const suffix = Number(match[2]);
                if (!Number.isSafeInteger(suffix) || suffix < 1) return new NextResponse(null, { status: 416 });
                start = Math.max(0, size - suffix);
            } else {
                start = Number(match[1]);
                end = match[2] ? Number(match[2]) : size - 1;
            }
            if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || start > end || end < 0) {
                return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
            }
            end = Math.min(end, size - 1);
        }
        const bytes = await readHelpVideoRange(video, start, end);
        const headers = new Headers({
            "Content-Type": "video/mp4",
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Length": String(bytes.byteLength),
        });
        if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
        return new NextResponse(new Uint8Array(bytes), { status: range ? 206 : 200, headers });
    } catch (error) {
        console.error("Help video playback failed", error);
        return new NextResponse(null, { status: 503 });
    }
}
