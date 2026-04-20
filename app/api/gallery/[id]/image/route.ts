import { NextRequest, NextResponse } from "next/server";
import { getGalleryImageBlobById } from "@/lib/gallery-db";

export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const imageId = Number(id);

        if (!Number.isInteger(imageId) || imageId <= 0) {
            return NextResponse.json({ error: "Invalid image id." }, { status: 400 });
        }

        const image = await getGalleryImageBlobById(imageId);

        if (!image || !image.is_active) {
            return NextResponse.json({ error: "Image not found." }, { status: 404 });
        }

        const etag = `"gallery-${image.id}-${new Date(image.updated_at).getTime()}"`;

        return new NextResponse(image.image_data, {
            status: 200,
            headers: {
                "Content-Type": image.mime_type,
                "Cache-Control": "public, max-age=31536000, immutable",
                ETag: etag,
            },
        });
    } catch (error) {
        console.error("Gallery image API error:", error);

        return NextResponse.json({ error: "Failed to load image." }, { status: 500 });
    }
}
