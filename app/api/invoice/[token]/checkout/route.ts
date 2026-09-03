import { NextRequest, NextResponse } from "next/server";
import { getInvoiceByPublicToken } from "@/lib/invoice-db";

function getBaseUrl(request: NextRequest) {
    const configured = process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (configured) return configured.replace(/\/$/, "");

    const origin = request.headers.get("origin")?.trim();
    if (origin) return origin.replace(/\/$/, "");

    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host")?.trim();
    if (host) return `${forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http")}://${host}`;

    return process.env.NODE_ENV === "production" ? "https://www.glitzofdiamonds.com" : "http://localhost:3000";
}

export async function POST(request: NextRequest, context: { params: Promise<{ token: string }> }) {
    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
        if (!stripeSecretKey) {
            return NextResponse.json({ success: false, error: "Invoice payments are not configured yet." }, { status: 500 });
        }

        const { token } = await context.params;
        const invoice = await getInvoiceByPublicToken(token);
        if (!invoice) return NextResponse.json({ success: false, error: "Invoice not found." }, { status: 404 });

        if (["paid", "void"].includes(invoice.display_status)) {
            return NextResponse.json({ success: false, error: "This invoice is not eligible for payment." }, { status: 400 });
        }

        const amountDueCents = Math.max(0, Number(invoice.total_cents) - Number(invoice.amount_paid_cents));
        if (amountDueCents <= 0) {
            return NextResponse.json({ success: false, error: "This invoice has no balance due." }, { status: 400 });
        }

        const baseUrl = getBaseUrl(request);
        const form = new URLSearchParams();
        form.append("mode", "payment");
        form.append("success_url", `${baseUrl}/invoice/${token}?payment=success`);
        form.append("cancel_url", `${baseUrl}/invoice/${token}?payment=cancelled`);
        form.append("line_items[0][quantity]", "1");
        form.append("line_items[0][price_data][currency]", "usd");
        form.append("line_items[0][price_data][unit_amount]", String(amountDueCents));
        form.append("line_items[0][price_data][product_data][name]", `Glitz Of Diamonds Invoice ${invoice.invoice_number}`);
        form.append("line_items[0][price_data][product_data][description]", `Payment for invoice ${invoice.invoice_number}`);
        form.append("metadata[source]", "glitz-invoice");
        form.append("metadata[invoiceId]", String(invoice.id));
        form.append("metadata[invoiceNumber]", invoice.invoice_number);
        form.append("metadata[publicToken]", token);
        form.append("metadata[amountDueCents]", String(amountDueCents));
        if (invoice.member_email) form.append("customer_email", invoice.member_email);

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
            error?: { message?: string };
        };

        if (!stripeResponse.ok || !stripeData.url || !stripeData.id) {
            return NextResponse.json({
                success: false,
                error: stripeData.error?.message || "Unable to create payment checkout right now.",
            }, { status: 502 });
        }

        return NextResponse.json({ success: true, checkoutUrl: stripeData.url, sessionId: stripeData.id });
    } catch (error) {
        console.error("Invoice Stripe checkout error:", error);
        return NextResponse.json({ success: false, error: "Unable to start invoice payment." }, { status: 500 });
    }
}
