import { NextResponse } from "next/server";
import { getPublicGalleryImages } from "@/lib/gallery-db";

export async function GET() {
    try {
        const images = await getPublicGalleryImages();

        return NextResponse.json({
            success: true,
            images: images.map((image) => ({
                id: image.id,
                caption: image.caption,
                imageUrl: `/api/gallery/${image.id}/image?v=${encodeURIComponent(image.updated_at)}`,
                createdAt: image.created_at,
            })),
        });
    } catch (error) {
        console.error("Public gallery API error:", error);

        return NextResponse.json(
            { success: false, images: [], error: "Failed to load gallery images." },
            { status: 500 }
        );
    }
}
