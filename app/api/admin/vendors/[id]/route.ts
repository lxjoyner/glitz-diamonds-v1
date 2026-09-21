import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { deleteVendor, getVendorById, updateVendor } from "@/lib/vendor-db";

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

function parseId(id: string) {
    const value = Number(id);
    return Number.isInteger(value) && value > 0 ? value : null;
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;

    const { id } = await context.params;
    const vendorId = parseId(id);
    if (!vendorId) return NextResponse.json({ success: false, error: "Invalid vendor." }, { status: 400 });

    const vendor = await getVendorById(vendorId);
    if (!vendor) return NextResponse.json({ success: false, error: "Vendor not found." }, { status: 404 });

    return NextResponse.json({ success: true, vendor });
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;

    const { id } = await context.params;
    const vendorId = parseId(id);
    if (!vendorId) return NextResponse.json({ success: false, error: "Invalid vendor." }, { status: 400 });

    try {
        const body = await req.json();
        const vendor = await updateVendor(vendorId, {
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
        return NextResponse.json({ success: true, vendor });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_NAME") {
            return NextResponse.json({ success: false, error: "Vendor name is required." }, { status: 400 });
        }
        console.error("Update vendor failed:", error);
        return NextResponse.json({ success: false, error: "Failed to update vendor." }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const authError = requireAccess(req);
    if (authError) return authError;

    const { id } = await context.params;
    const vendorId = parseId(id);
    if (!vendorId) return NextResponse.json({ success: false, error: "Invalid vendor." }, { status: 400 });

    const deleted = await deleteVendor(vendorId);
    if (!deleted) return NextResponse.json({ success: false, error: "Vendor not found." }, { status: 404 });

    return NextResponse.json({ success: true });
}
