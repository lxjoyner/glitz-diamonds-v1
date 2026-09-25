import { NextResponse } from "next/server";
import { recordInvoiceEmailPixelOpen } from "@/lib/invoice-email-tracking";

// Real 1x1 transparent GIF; image loading may be blocked or proxied by email clients.
// Never treat a pixel request as proof that the member personally read an email.
const gif = Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=", "base64");
export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
    const { token } = await context.params;
    if (/^[a-f0-9]{64}$/i.test(token)) {
        try {
            await recordInvoiceEmailPixelOpen(token);
        } catch (error) {
            console.error("Invoice email pixel tracking failed:", error);
        }
    }
    return new NextResponse(new Uint8Array(gif), {
        headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "X-Robots-Tag": "noindex, nofollow",
        },
    });
}
