import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    createManualDonationRecord,
    createDetailedManualDonation,
    getDonationPaymentAccounts,
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

    const [donations, accounts] = await Promise.all([getAllDonations(), getDonationPaymentAccounts()]);
    return NextResponse.json({ success: true, donations, accounts });
}

export async function POST(req: NextRequest) {
    const auth = requireTreasurerOrAdmin(req);
    if ("error" in auth) return auth.error;

    const body = await req.json();

    if (body?.mode === "manual-detailed") {
        const dollars = String(body.amount || "").trim();
        if (!/^\d+(?:\.\d{1,2})?$/.test(dollars) ||
            !Number.isSafeInteger(Math.round(Number(dollars) * 100))) {
            return NextResponse.json({ success: false, error: "Enter a valid dollar amount." }, { status: 400 });
        }
        try {
            const id = await createDetailedManualDonation({
                donorName: String(body.donorName || ""),
                donorEmail: String(body.donorEmail || ""),
                message: String(body.message || ""),
                donationDate: String(body.donationDate || ""),
                amountCents: Math.round(Number(dollars) * 100),
                accountName: String(body.accountName || ""),
                paymentMethod: String(body.paymentMethod || ""),
                referenceNumber: String(body.referenceNumber || ""),
                memberId: body.memberId == null || body.memberId === "" ? null : Number(body.memberId),
            });
            return NextResponse.json({ success: true, id }, { status: 201 });
        } catch (error) {
            const code = error instanceof Error ? error.message : "";
            if (["INVALID_DONATION","INVALID_ACCOUNT","INVALID_MEMBER"].includes(code)) {
                return NextResponse.json({ success: false, error:
                    code === "INVALID_ACCOUNT" ? "Select an active payment account." :
                    code === "INVALID_MEMBER" ? "Select a valid existing member." :
                    "Check the donation date, donor, amount and payment details."
                }, { status: 400 });
            }
            console.error("Manual donation save error:", error);
            return NextResponse.json({ success: false, error: "Unable to save manual donation." }, { status: 500 });
        }
    }

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
