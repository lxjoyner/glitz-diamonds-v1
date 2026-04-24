import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    createGalleryImage,
    deleteGalleryImageById,
    getAllGalleryImages,
    updateGalleryImageOrder,
} from "@/lib/gallery-db";

const MAX_UPLOAD_MB = 18;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function requireAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }

    try {
        const payload = verifyAdminToken(token);

        if (payload.role !== "admin" && payload.role !== "secretary") {
            return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
        }

        return { ok: true as const };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    try {
        const images = await getAllGalleryImages();

        return NextResponse.json({
            success: true,
            images: images.map((image) => ({
                id: image.id,
                caption: image.caption,
                isActive: Boolean(image.is_active),
                mimeType: image.mime_type,
                sortOrder: image.sort_order,
                createdAt: image.created_at,
                updatedAt: image.updated_at,
                imageUrl: `/api/gallery/${image.id}/image?v=${encodeURIComponent(image.updated_at)}`,
            })),
        });
    } catch (error) {
        console.error("Admin gallery GET error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to load gallery images." },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    try {
        const body = await req.json();
        const imageIds: number[] = Array.isArray(body?.imageIds)
            ? body.imageIds.map((id: unknown) => Number(id))
            : [];

        if (imageIds.length === 0 || imageIds.some((id) => !Number.isInteger(id) || id <= 0)) {
            return NextResponse.json(
                { success: false, error: "A valid ordered imageIds array is required." },
                { status: 400 }
            );
        }

        await updateGalleryImageOrder(imageIds);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin gallery PUT error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to update gallery order." },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    try {
        const formData = await req.formData();
        const caption = String(formData.get("caption") || "").trim();
        const isActive = String(formData.get("isActive") || "true") === "true";
        const file = formData.get("file");

        if (!caption) {
            return NextResponse.json(
                { success: false, error: "Caption is required." },
                { status: 400 }
            );
        }

        if (!(file instanceof File)) {
            return NextResponse.json(
                { success: false, error: "Image file is required." },
                { status: 400 }
            );
        }

        if (!ALLOWED_MIME_TYPES.has(file.type)) {
            return NextResponse.json(
                { success: false, error: "Unsupported file type. Use JPG, PNG, WEBP, or GIF." },
                { status: 400 }
            );
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return NextResponse.json(
                { success: false, error: `Image exceeds ${MAX_UPLOAD_MB}MB limit.` },
                { status: 400 }
            );
        }

        const imageBuffer = Buffer.from(await file.arrayBuffer());
        const imageId = await createGalleryImage({
            caption,
            mimeType: file.type,
            imageData: imageBuffer,
            isActive,
        });

        return NextResponse.json({ success: true, imageId });
    } catch (error) {
        console.error("Admin gallery POST error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to upload gallery image." },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const auth = requireAdmin(req);
    if ("error" in auth) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const imageId = Number(searchParams.get("id"));

        if (!Number.isInteger(imageId) || imageId <= 0) {
            return NextResponse.json(
                { success: false, error: "Valid image id is required." },
                { status: 400 }
            );
        }

        await deleteGalleryImageById(imageId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Admin gallery DELETE error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to delete gallery image." },
            { status: 500 }
        );
    }
}
