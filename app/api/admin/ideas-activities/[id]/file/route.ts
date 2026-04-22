import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getIdeaFileById } from "@/lib/ideas-activities-db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
        verifyAdminToken(token);
        const { id } = await params;
        const file = await getIdeaFileById(Number(id));
        if (!file || !file.file_data || !file.file_mime_type) {
            return NextResponse.json({ success: false, error: "File not found." }, { status: 404 });
        }

        const fileBuffer = new Uint8Array(file.file_data);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": file.file_mime_type,
                "Content-Disposition": `inline; filename="${file.file_name || `idea-${id}`}"`,
            },
        });
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}
