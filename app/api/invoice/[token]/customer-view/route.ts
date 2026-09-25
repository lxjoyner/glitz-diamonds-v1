import { NextRequest, NextResponse } from "next/server";
import { recordCustomerInvoiceView } from "@/lib/invoice-db";

export async function POST(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
    const { token } = await context.params;
    if (!/^[a-f0-9]{64}$/i.test(token)) return NextResponse.json({ success: false }, { status: 404 });
    try {
        const recorded = await recordCustomerInvoiceView(token);
        if (!recorded) return NextResponse.json({ success: false }, { status: 404 });
        return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        console.error("Invoice browser view tracking failed:", error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
