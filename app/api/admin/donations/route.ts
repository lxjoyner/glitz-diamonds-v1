import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    createManualDonationRecord,
    deleteDonationRecordById,
    getAllDonations,
    upsertCompletedStripeDonation,
} from "@/lib/donation-db";

function requireTreasurerOrAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }

    try {
        const payload = verifyAdminToken(token);

        if (payload.role !== "admin" && payload.role !== "treasurer") {
            return { error: NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 }) };
        }

        return { ok: true as const };
    } catch {
        return { error: NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }) };
    }
}

export async function GET(req: NextRequest) {
    const auth = requireTreasurerOrAdmin(req);
    if ("error" in auth) return auth.error;

    const donations = await getAllDonations();
    return NextResponse.json({ success: true, donations });
}

export async function POST(req: NextRequest) {
    const auth = requireTreasurerOrAdmin(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();

    if (body?.mode === "manual") {
        const amountCents = Number(body.amountCents || 0);
        if (!Number.isFinite(amountCents) || amountCents < 100) {
            return NextResponse.json({ success: false, error: "Valid amountCents is required." }, { status: 400 });
        }

        await createManualDonationRecord({
            donorName: body.donorName,
            donorEmail: body.donorEmail,
            message: body.message,
            amountCents,
        });

        const donations = await getAllDonations();
        return NextResponse.json({ success: true, donations });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
    if (!stripeSecretKey) {
        return NextResponse.json({ success: false, error: "Missing STRIPE_SECRET_KEY." }, { status: 500 });
    }

    const limit = Math.min(Math.max(Number(body?.limit || 25), 1), 100);
    const params = new URLSearchParams({ limit: String(limit) });

    const stripeRes = await fetch(`https://api.stripe.com/v1/payment_intents?${params.toString()}`, {
        headers: { Authorization: `Bearer ${stripeSecretKey}` },
        cache: "no-store",
    });
    const stripeData = (await stripeRes.json()) as {
        data?: Array<{
            id: string;
            amount_received: number;
            status: string;
            created: number;
            receipt_email?: string | null;
            metadata?: Record<string, string>;
        }>;
    };

    if (!stripeRes.ok) {
        return NextResponse.json({ success: false, error: "Failed to load Stripe payment intents." }, { status: 502 });
    }

    const intents = stripeData.data || [];
    for (const intent of intents) {
        if (intent.status !== "succeeded" || intent.amount_received <= 0) continue;

        await upsertCompletedStripeDonation({
            paymentIntentId: intent.id,
            amountCents: intent.amount_received,
            donorName: intent.metadata?.donorName,
            donorEmail: intent.receipt_email ?? intent.metadata?.donorEmail,
            message: intent.metadata?.message,
            createdAtUnix: intent.created,
        });
    }

    const donations = await getAllDonations();
    return NextResponse.json({ success: true, donations, synced: intents.length });
}

export async function DELETE(req: NextRequest) {
    const auth = requireTreasurerOrAdmin(req);
    if ("error" in auth) return auth.error;

    const body = await req.json().catch(() => null);
    const id = Number(body?.id);

    if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ success: false, error: "Valid donation id is required." }, { status: 400 });
    }

    await deleteDonationRecordById(id);
    const donations = await getAllDonations();
    return NextResponse.json({ success: true, donations });
}
