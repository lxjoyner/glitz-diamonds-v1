import { NextResponse } from "next/server";
import { getInvoiceLogo } from "@/lib/invoice-db";

export async function GET() {
    try {
        const logo = await getInvoiceLogo();
        if (!logo?.logo_data || !logo.logo_mime_type) {
            return new NextResponse(null, { status: 404 });
        }
        return new NextResponse(new Uint8Array(logo.logo_data), {
            status: 200,
            headers: {
                "Content-Type": logo.logo_mime_type,
                "Cache-Control": "public, max-age=300",
            },
        });
    } catch (error) {
        console.error("Invoice logo GET error:", error);
        return new NextResponse(null, { status: 500 });
    }
}
