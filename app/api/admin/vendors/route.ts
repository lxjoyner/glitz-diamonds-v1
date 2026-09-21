import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { createVendor, listVendors } from "@/lib/vendor-db";

function requireAccess(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    try {
        const payload = verifyAdminToken(token);
        if (!["admin", "treasurer"].includes(payload.role)) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
        return null;
    } catch {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
}

export async function GET(req: NextRequest) {
    const authError = requireAccess(req);
    if (authError) return authError;
    const vendors = await listVendors();
    return NextResponse.json({ success: true, vendors });
}

export async function POST(req: NextRequest) {
    const authError = requireAccess(req);
    if (authError) return authError;

    try {
        const body = await req.json();
        const vendor = await createVendor({
            vendorName: String(body.vendorName || ""),
            vendorType: body.vendorType === "1099-nec" ? "1099-nec" : "regular",
            firstName: body.firstName,
            lastName: body.lastName,
            currency: body.currency,
            email: body.email,
            country: body.country,
            provinceState: body.provinceState,
            address1: body.address1,
            address2: body.address2,
            city: body.city,
            postalCode: body.postalCode,
            additionalInfo: body.additionalInfo,
        });
        return NextResponse.json({ success: true, vendor }, { status: 201 });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_NAME") {
            return NextResponse.json({ success: false, error: "Vendor name is required." }, { status: 400 });
        }
        console.error("Create vendor failed:", error);
        return NextResponse.json({ success: false, error: "Failed to create vendor." }, { status: 500 });
    }
}
