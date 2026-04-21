import { NextRequest, NextResponse } from "next/server";
import { createDonationRecord } from "@/lib/donation-db";

const MIN_AMOUNT_CENTS = 100;
const MAX_AMOUNT_CENTS = 100000;

function getBaseUrl(request: NextRequest) {
    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

    if (configuredUrl) {
        return configuredUrl.replace(/\/$/, "");
    }

    const origin = request.headers.get("origin")?.trim();

    if (origin) {
        return origin.replace(/\/$/, "");
    }

    return "http://localhost:3000";
}

export async function POST(request: NextRequest) {
    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
        const priceId = process.env.STRIPE_DONATION_PRICE_ID?.trim();

        if (!stripeSecretKey) {
            return NextResponse.json(
                {
                    error: "Missing STRIPE_SECRET_KEY.",
                    details:
                        "Set STRIPE_SECRET_KEY in .env.local at the project root and restart `npm run dev`.",
                }
            );
        }

        const body = (await request.json()) as {
            amount?: number;
            donorName?: string;
            donorEmail?: string;
            message?: string;
        };

        const rawAmount = Number(body.amount ?? 0);
        const unitAmount = Math.round(rawAmount * 100);

        if (!Number.isFinite(unitAmount) || unitAmount < MIN_AMOUNT_CENTS || unitAmount > MAX_AMOUNT_CENTS) {
            return NextResponse.json(
                {
                    error: `Donation amount must be between $${MIN_AMOUNT_CENTS / 100} and $${MAX_AMOUNT_CENTS / 100}.`,
                },
                { status: 400 }
            );
        }

        const baseUrl = getBaseUrl(request);

        const form = new URLSearchParams();
        form.append("mode", "payment");
        form.append("success_url", `${baseUrl}/donate?status=success`);
        form.append("cancel_url", `${baseUrl}/donate?status=cancelled`);
        form.append("line_items[0][quantity]", "1");

        if (priceId) {
            form.append("line_items[0][price]", priceId);
        } else {
            form.append("line_items[0][price_data][currency]", "usd");
            form.append("line_items[0][price_data][unit_amount]", String(unitAmount));
            form.append("line_items[0][price_data][product_data][name]", "Glitz Of Diamonds Donation");
            form.append(
                "line_items[0][price_data][product_data][description]",
                "Support community programs and outreach events."
            );
        }

        if (body.donorEmail?.trim()) {
            form.append("customer_email", body.donorEmail.trim());
        }

        if (body.donorName?.trim()) {
            form.append("metadata[donorName]", body.donorName.trim());
        }

        if (body.message?.trim()) {
            form.append("metadata[message]", body.message.trim().slice(0, 250));
        }

        form.append("metadata[source]", "glitz-of-diamonds-website");

        if (priceId) {
            form.append("metadata[requestedAmount]", String(unitAmount));
        }

        const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${stripeSecretKey}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: form,
        });

        const stripeData = (await stripeResponse.json()) as {
            id?: string;
            url?: string;
            error?: {
                message?: string;
            };
        };

        if (!stripeResponse.ok || !stripeData.url) {
            return NextResponse.json(
                {
                    error:
                        stripeData.error?.message ??
                        "Unable to create a Stripe checkout session right now.",
                },
                { status: 502 }
            );
        }

        if (stripeData.id) {
            await createDonationRecord({
                donorName: body.donorName?.trim(),
                donorEmail: body.donorEmail?.trim(),
                message: body.message?.trim().slice(0, 250),
                amountCents: unitAmount,
                stripeSessionId: stripeData.id,
            });
        }

        return NextResponse.json({ checkoutUrl: stripeData.url, sessionId: stripeData.id });
    } catch (error) {
        console.error("Stripe checkout creation failed:", error);

        return NextResponse.json(
            { error: "Unexpected error while creating donation checkout session." },
            { status: 500 }
        );
    }
}
