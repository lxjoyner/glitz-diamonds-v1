import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { HELP_TOPICS } from "@/lib/help-catalog";
import { createCustomTopic, deleteCustomTopic, listCustomTopics, updateCustomTopic } from "@/lib/help-custom-topics-db";
import { listHelpVideos } from "@/lib/help-video-db";

function deny(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try { if (verifyAdminToken(token).role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 }); }
    catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
    return null;
}
export async function GET(req: NextRequest) {
    const error = deny(req); if (error) return error;
    try {
        const topics = await listCustomTopics();
        return NextResponse.json({ success: true, topics,
            parentTopics: HELP_TOPICS.map(({ id, title, category }) => ({ id,title,category })) },
            { headers: { "Cache-Control": "no-store" } });
    } catch (cause) {
        console.error("Custom Help topic list failed",cause);
        return NextResponse.json({ error: "Unable to load Help topics." }, { status: 500 });
    }
}
function parseBody(body: Record<string, unknown>) {
    return {
        parentTopicId: typeof body.parentTopicId === "string" ? body.parentTopicId : "",
        title: typeof body.title === "string" ? body.title.trim() : "",
        category: typeof body.category === "string" ? body.category.trim() : "",
        summary: typeof body.summary === "string" ? body.summary.trim() : "",
    };
}
export async function POST(req: NextRequest) {
    const error = deny(req); if (error) return error;
    try {
        const input = parseBody(await req.json());
        const id = await createCustomTopic(input);
        return NextResponse.json({ success: true,id }, { status: 201 });
    } catch (cause) {
        if (cause instanceof Error && /Invalid|Select a valid/.test(cause.message))
            return NextResponse.json({ error: cause.message }, { status: 400 });
        console.error("Create Help topic failed", cause);
        return NextResponse.json({ error: "Unable to create Help topic." }, { status: 500 });
    }
}
export async function PATCH(req: NextRequest) {
    const error = deny(req); if (error) return error;
    try {
        const body = await req.json();
        await updateCustomTopic({ id: typeof body.id === "string" ? body.id : "", ...parseBody(body) });
        return NextResponse.json({ success: true });
    } catch (cause) {
        if (cause instanceof Error && /Invalid|Select a valid/.test(cause.message))
            return NextResponse.json({ error: cause.message }, { status: 400 });
        console.error("Update Help topic failed",cause);
        return NextResponse.json({ error: "Unable to update Help topic." }, { status: 500 });
    }
}
export async function DELETE(req: NextRequest) {
    const error = deny(req); if (error) return error;
    try {
        const id = req.nextUrl.searchParams.get("id") || "";
        await listHelpVideos(); // Ensure video metadata table exists before checking references.
        await deleteCustomTopic(id);
        return NextResponse.json({ success: true });
    } catch (cause) {
        if (cause instanceof Error && /Only custom|Remove or reassign/.test(cause.message))
            return NextResponse.json({ error: cause.message }, { status: 400 });
        console.error("Delete Help topic failed",cause);
        return NextResponse.json({ error: "Unable to delete Help topic." }, { status: 500 });
    }
}
