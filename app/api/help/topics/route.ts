import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getAdminSettings } from "@/lib/admin-settings-db";
import { visibleHelpTopicsFromDb } from "@/lib/help-custom-topics-db";
import { listVisibleHelpVideos } from "@/lib/help-video-db";

// Do not expose role-restricted catalog entries or disabled Help content.
// The browser receives only the topics permitted for its signed-in role.
export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    let role: string;
    try {
        role = verifyAdminToken(token).role;
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!["admin", "treasurer", "secretary", "member"].includes(role)) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    try {
        const settings = await getAdminSettings();
        if (Number(settings.help_enabled) === 0) {
            return NextResponse.json({ success: false, error: "Help is disabled.", helpEnabled: false }, {
                status: 403, headers: { "Cache-Control": "no-store" },
            });
        }
        const videos = await listVisibleHelpVideos(role);
        const byTopic = new Map<string, Array<{ id: number; title: string; description: string; url: string }>>();
        for (const video of videos) {
            const list = byTopic.get(video.topic_id) || [];
            list.push({ id: video.id, title: video.title, description: video.description, url: "/api/help/videos/" + video.id });
            byTopic.set(video.topic_id, list);
        }
        const topics = (await visibleHelpTopicsFromDb(role)).map(({ roles, videoStatus, ...topic }) => ({
            ...topic,
            videoStatus: byTopic.has(topic.id) ? "available" : videoStatus,
            videos: byTopic.get(topic.id) || [],
        }));
        return NextResponse.json({ success: true, helpEnabled: true, role, topics }, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("Unable to load Help catalog:", error);
        return NextResponse.json({ success: false, error: "Help is temporarily unavailable." }, { status: 503 });
    }
}
