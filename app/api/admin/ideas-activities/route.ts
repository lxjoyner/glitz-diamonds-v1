import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    createIdeaActivity,
    getIdeasAndActivities,
    getScheduledEvents,
} from "@/lib/ideas-activities-db";

const ALLOWED_ROLES = new Set(["member", "secretary", "treasurer", "admin"]);
const ALLOWED_UPLOAD_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]);

function requireLoggedInUser(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }

    try {
        const payload = verifyAdminToken(token);
        if (!ALLOWED_ROLES.has(payload.role)) {
            return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
        }

        return {
            user: {
                id: Number(payload.sub),
                role: payload.role,
            },
        };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireLoggedInUser(req);
    if ("error" in auth) return auth.error;

    const [ideas, scheduledEvents] = await Promise.all([
        getIdeasAndActivities(auth.user.id),
        getScheduledEvents(),
    ]);

    const categoryMap = new Map<string, number>();
    for (const idea of ideas) {
        categoryMap.set(idea.category, (categoryMap.get(idea.category) || 0) + Number(idea.vote_count || 0));
    }

    const popularCategory = [...categoryMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

    const smartRecommendation = popularCategory
        ? `You might also like: ${popularCategory} + Connection Meetup`
        : "You might also like: Outdoor Yoga + Smoothie Meetup";

    return NextResponse.json({
        success: true,
        ideas,
        scheduledEvents,
        popularCategory: popularCategory || null,
        smartRecommendation,
    });
}

export async function POST(req: NextRequest) {
    const auth = requireLoggedInUser(req);
    if ("error" in auth) return auth.error;

    const formData = await req.formData();

    const title = String(formData.get("title") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const purpose = String(formData.get("purpose") || "").trim();
    const locationType = String(formData.get("locationType") || "").trim();
    const location = String(formData.get("location") || "").trim();
    const budgetRange = String(formData.get("budgetRange") || "").trim();
    const timeCommitment = String(formData.get("timeCommitment") || "").trim();
    const groupSize = Number(formData.get("groupSize") || "0");
    const preferredStartDate = String(formData.get("preferredStartDate") || "").trim();
    const preferredEndDate = String(formData.get("preferredEndDate") || "").trim();
    const status = String(formData.get("status") || "draft").trim() === "submitted" ? "submitted" : "draft";

    if (
        !title ||
        !details ||
        !category ||
        !purpose ||
        !locationType ||
        !location ||
        !budgetRange ||
        !timeCommitment ||
        !preferredStartDate ||
        !preferredEndDate ||
        Number.isNaN(groupSize) ||
        groupSize < 1 ||
        groupSize > 500
    ) {
        return NextResponse.json(
            { success: false, error: "Please complete all required fields. Group size must be between 1 and 500." },
            { status: 400 }
        );
    }

    let fileName: string | null = null;
    let fileMimeType: string | null = null;
    let fileData: Buffer | null = null;
    const fileValue = formData.get("file");

    if (fileValue && fileValue instanceof File && fileValue.size > 0) {
        if (!ALLOWED_UPLOAD_TYPES.has(fileValue.type)) {
            return NextResponse.json(
                { success: false, error: "Upload must be an image or PDF." },
                { status: 400 }
            );
        }

        fileName = fileValue.name;
        fileMimeType = fileValue.type;
        fileData = Buffer.from(await fileValue.arrayBuffer());
    }

    const ideaId = await createIdeaActivity({
        createdByUserId: auth.user.id,
        title,
        details,
        category,
        purpose,
        locationType,
        location,
        budgetRange,
        timeCommitment,
        groupSize,
        preferredStartDate,
        preferredEndDate,
        fileName,
        fileMimeType,
        fileData,
        status,
    });

    return NextResponse.json({ success: true, ideaId });
}
