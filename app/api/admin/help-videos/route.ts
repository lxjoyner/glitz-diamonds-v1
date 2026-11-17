import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createHelpVideo, deleteHelpVideo, listHelpVideos, updateHelpVideo, validateHelpTopic } from "@/lib/help-video-db";

function requireAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
        if (verifyAdminToken(token).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return null;
}
function isValidId(value: unknown): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export async function GET(req: NextRequest) {
    const denied = requireAdmin(req); if (denied) return denied;
    try {
        const videos = (await listHelpVideos()).map(({ filename, ...safe }) => safe);
        return NextResponse.json({ success: true, videos }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Help video listing failed", error);
        return NextResponse.json({ error: "Unable to list videos." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const denied = requireAdmin(req); if (denied) return denied;
    const length = Number(req.headers.get("content-length") || "0");
    if (length > 31 * 1024 * 1024) return NextResponse.json({ error: "Upload exceeds 30MB limit." }, { status: 413 });
    try {
        const form = await req.formData();
        const file = form.get("file");
        const topicId = String(form.get("topicId") || "");
        const title = String(form.get("title") || "").trim();
        const description = String(form.get("description") || "").trim();
        if (!(file instanceof File) || !(await validateHelpTopic(topicId)) || !title || title.length > 180 || description.length > 2000) {
            return NextResponse.json({ error: "Valid MP4, Help topic and title are required." }, { status: 400 });
        }
        const id = await createHelpVideo({ topicId, title, description, file });
        return NextResponse.json({ success: true, id }, { status: 201 });
    } catch (error) {
        console.error("Help video upload failed", error);
        const detail = error instanceof Error ? error.message : "";
        if (/Invalid|Only MP4|30MB|valid MP4|not a valid MP4/i.test(detail)) return NextResponse.json({ error: detail }, { status: 400 });
        return NextResponse.json({ error: "Video upload failed. Check private storage configuration and permissions." }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const denied = requireAdmin(req); if (denied) return denied;
    try {
        const body = await req.json();
        if (!isValidId(body.id) || typeof body.topicId !== "string" || !(await validateHelpTopic(body.topicId))
            || typeof body.title !== "string" || !body.title.trim() || body.title.length > 180
            || typeof body.description !== "string" || body.description.length > 2000 || typeof body.active !== "boolean") {
            return NextResponse.json({ error: "Invalid video update." }, { status: 400 });
        }
        await updateHelpVideo({ id: body.id, topicId: body.topicId, title: body.title.trim(), description: body.description.trim(), active: body.active });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Help video update failed", error);
        return NextResponse.json({ error: "Unable to update video." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const denied = requireAdmin(req); if (denied) return denied;
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!isValidId(id)) return NextResponse.json({ error: "Valid ID required." }, { status: 400 });
    try {
        await deleteHelpVideo(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Help video deletion failed", error);
        return NextResponse.json({ error: "Unable to delete video." }, { status: 500 });
    }
}
