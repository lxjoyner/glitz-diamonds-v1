import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { recordStripePayment } from "@/lib/invoice-db";
import { sendInvoicePaymentNotification, sendInvoicePaymentReceipt } from "@/lib/mailer";

function parseStripeSignature(header: string) {
    const parts = header.split(",").map((part) => part.trim());
    const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
    const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
    return { timestamp, signatures };
}

function verifyStripeSignature(payload: string, header: string, secret: string) {
    const { timestamp, signatures } = parseStripeSignature(header);
    if (!timestamp || signatures.length === 0) return false;

    const signedPayload = `${timestamp}.${payload}`;
    const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

    return signatures.some((signature) => {
        try {
            return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
        } catch {
            return false;
        }
    });
}

type StripeCheckoutSession = {
    id: string;
    payment_status?: string;
    payment_intent?: string | null;
    amount_total?: number | null;
    metadata?: Record<string, string> | null;
};

type StripeEvent = {
    id: string;
    type: string;
    data?: { object?: StripeCheckoutSession };
};

export async function POST(request: NextRequest) {
    const webhookSecret = process.env.STRIPE_INVOICE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
        return NextResponse.json({ error: "Missing STRIPE_INVOICE_WEBHOOK_SECRET." }, { status: 500 });
    }

    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

    const rawBody = await request.text();
    if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
    }

    let event: StripeEvent;
    try {
        event = JSON.parse(rawBody) as StripeEvent;
    } catch {
        return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }

    if (event.type !== "checkout.session.completed") {
        return NextResponse.json({ received: true });
    }

    try {
        const session = event.data?.object;
        if (!session?.id || session.payment_status !== "paid") {
            return NextResponse.json({ received: true });
        }

        const metadata = session.metadata || {};
        if (metadata.source !== "glitz-invoice") {
            return NextResponse.json({ received: true });
        }

        const invoiceId = Number(metadata.invoiceId);
        const amountCents = Number(session.amount_total ?? metadata.amountDueCents ?? 0);
        if (!Number.isInteger(invoiceId) || invoiceId <= 0 || !Number.isFinite(amountCents) || amountCents <= 0) {
            return NextResponse.json({ error: "Invalid invoice payment metadata." }, { status: 400 });
        }

        const result = await recordStripePayment({
            eventId: event.id,
            eventType: event.type,
            invoiceId,
            amountCents,
            sessionId: session.id,
            paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        });

        if (!result.duplicate && result.appliedAmount > 0) {
            if (result.invoice.member_email) {
                await sendInvoicePaymentReceipt({
                    toEmail: result.invoice.member_email,
                    memberName: result.invoice.member_name || "Member",
                    invoiceNumber: result.invoice.invoice_number,
                    paymentAmountCents: result.appliedAmount,
                    remainingBalanceCents: Math.max(0, Number(result.invoice.total_cents) - result.newAmountPaid),
                });
            }

            const adminEmails = (process.env.INVOICE_PAYMENT_NOTIFICATION_EMAILS || process.env.CONTACT_TO_WEMAIL || "")
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean);

            if (adminEmails.length > 0) {
                await sendInvoicePaymentNotification({
                    toEmails: adminEmails,
                    memberName: result.invoice.member_name || "Member",
                    invoiceNumber: result.invoice.invoice_number,
                    paymentAmountCents: result.appliedAmount,
                    totalPaidCents: result.newAmountPaid,
                    invoiceTotalCents: Number(result.invoice.total_cents),
                    status: result.newStatus,
                });
            }
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Stripe invoice webhook error:", error);
        return NextResponse.json({ error: "Failed to process invoice payment webhook." }, { status: 500 });
    }
}
