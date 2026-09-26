import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getBalanceSheetOpening, saveBalanceSheetOpening } from "@/lib/invoices-donations-balance-sheet";

function authorized(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return null;
    try {
        const user = verifyAdminToken(token);
        if (!["admin","treasurer"].includes(user.role)) return null;
        return user;
    } catch { return null; }
}

export async function GET(req: NextRequest) {
    if (!authorized(req)) return NextResponse.json({success:false,error:"Unauthorized"},{status:401});
    try { return NextResponse.json({success:true,opening:await getBalanceSheetOpening()}); }
    catch(error) {
        console.error("Balance Sheet opening read failed",error);
        return NextResponse.json({success:false,error:"Unable to load starting balance."},{status:500});
    }
}

export async function PUT(req: NextRequest) {
    const user = authorized(req);
    if (!user) return NextResponse.json({success:false,error:"Unauthorized"},{status:401});
    if (user.role !== "admin") return NextResponse.json({success:false,error:"Only administrators can update opening balances."},{status:403});
    try {
        const data = await req.json();
        await saveBalanceSheetOpening(String(data.balanceDate || ""),Number(data.openingCents));
        return NextResponse.json({success:true,opening:await getBalanceSheetOpening()});
    } catch(error) {
        if (error instanceof Error && error.message==="INVALID_OPENING")
            return NextResponse.json({success:false,error:"Enter a valid balance date and nonnegative opening amount."},{status:400});
        console.error("Balance Sheet opening save failed",error);
        return NextResponse.json({success:false,error:"Unable to save opening balance."},{status:500});
    }
}
