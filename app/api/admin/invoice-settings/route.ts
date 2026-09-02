import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoiceSettings, updateInvoiceSettings } from "@/lib/invoice-db";

const ALLOWED_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_LOGO_BYTES = 4 * 1024 * 1024;

function requireAdmin(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const payload = verifyAdminToken(token);
        if (payload.role !== "admin") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        return null;
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

export async function GET(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;
    const settings = await getInvoiceSettings();
    return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
    const authError = requireAdmin(req);
    if (authError) return authError;
    try {
        const formData = await req.formData();
        const file = formData.get("logo");
        let logoData: Buffer | undefined;
        let logoMimeType: string | undefined;
        if (file instanceof File && file.size > 0) {
            if (!ALLOWED_LOGO_TYPES.has(file.type)) {
                return NextResponse.json({ success: false, error: "Logo must be PNG, JPG, or WEBP." }, { status: 400 });
            }
            if (file.size > MAX_LOGO_BYTES) {
                return NextResponse.json({ success: false, error: "Logo must be 4MB or smaller." }, { status: 400 });
            }
            logoData = Buffer.from(await file.arrayBuffer());
            logoMimeType = file.type;
        }
        const settings = await updateInvoiceSettings({
            businessName: String(formData.get("businessName") || "Glitz Of Diamonds"),
            businessAddress: String(formData.get("businessAddress") || ""),
            businessPhone: String(formData.get("businessPhone") || ""),
            businessEmail: String(formData.get("businessEmail") || ""),
            invoicePrefix: String(formData.get("invoicePrefix") || "GOD"),
            defaultTerms: String(formData.get("defaultTerms") || ""),
            footerText: String(formData.get("footerText") || ""),
            ...(logoData ? { logoData, logoMimeType } : {}),
        });
        return NextResponse.json({ success: true, settings });
    } catch (error) {
        console.error("Invoice settings POST error:", error);
        return NextResponse.json({ success: false, error: "Failed to save invoice settings." }, { status: 500 });
    }
}
