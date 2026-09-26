import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoicesDonationsBalanceSheet, type BalanceSheetType } from "@/lib/invoices-donations-balance-sheet";
import { balanceSheetRows } from "@/lib/balance-sheet-rows";

const dollars = (cents: number) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"}).format(cents / 100);
const csvQuote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

function makeCsv(report: Awaited<ReturnType<typeof getInvoicesDonationsBalanceSheet>>, view: "summary" | "details") {
    const number = (cents: number) => (cents / 100).toFixed(2);
    const lines = [
        ["Glitz Of Diamonds - Balance Sheet"],
        [`As of ${report.asOf}`],
        [`Report Type: ${report.reportType === "accrual" ? "Accrual (Paid & Unpaid)" : "Cash Basis (Recorded Payments)"}`],
        [`View: ${view}`],
        [],
        ["Label", "Amount USD"],
        ["Cash and Bank", number(report.cashOnHandCents)],
        ["To be received", number(report.accountsReceivableCents)],
        ["Total Invoices and Donations", number(report.totalInvoicesDonationsCents)],
        [],
        ["ACCOUNTS", report.asOf],
        ...balanceSheetRows(report, view === "details").map(row => [
            `${"  ".repeat(row.level)}${row.label}`, row.amount == null ? "" : number(row.amount),
        ]),
        [],
        ["Calculated Cash and Bank (not a reconciled bank balance)", number(report.netRecordedCashMovementCents)],
        ["Report notes"],
        ...report.notes.map(note => [note]),
    ];
    return "\uFEFF" + lines.map(line => line.map(csvQuote).join(",")).join("\r\n") + "\r\n";
}

function pdfEscape(s: string) {
    return s.replace(/[^\x20-\x7e]/g, " ").replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function makePdf(report: Awaited<ReturnType<typeof getInvoicesDonationsBalanceSheet>>, view: "summary" | "details") {
    // Build a styled, dependency-free PDF matching the browser's report sections.
    // An absent verified cash/bank opening is N/A, never silently $0.
    const pages: string[][] = [];
    let commands: string[] = [];
    let y = 745;
    const safe = (value: string) => pdfEscape(value);
    const addText = (x: number, top: number, value: string, size = 11, bold = false, color = "0.10 0.17 0.25") => {
        commands.push(color + " rg BT /" + (bold ? "F2" : "F1") + " " + size +
            " Tf 1 0 0 1 " + x + " " + top + " Tm (" + safe(value) + ") Tj ET");
    };
    const fill = (x: number, top: number, width: number, height: number, color: string) =>
        commands.push(color + " rg " + x + " " + top + " " + width + " " + height + " re f");
    const rule = (top: number) => commands.push("0.84 0.88 0.92 RG 0.7 w 45 " + top + " m 567 " + top + " l S");
    const right = (value: string, top: number, bold = false) => {
        // Helvetica currency fields are short; the estimate right-aligns visually.
        const width = value.length * (bold ? 6.45 : 6.05);
        addText(550 - width, top, value, 11, bold);
    };
    function header() {
        addText(45, y, "Glitz Of Diamonds", 19, true);
        y -= 29;
        addText(45, y, "Balance Sheet - Invoices & Donations", 14, true);
        y -= 21;
        addText(45, y, "As of " + report.asOf + "    |    " +
            (report.reportType === "accrual" ? "Accrual (Paid & Unpaid)" : "Cash Basis (Recorded Payments)") +
            "    |    " + (view === "details" ? "Details" : "Summary"), 10);
        y -= 27; rule(y); y -= 17;
    }
    const nextPage = () => {
        if (commands.length) pages.push(commands);
        commands = []; y = 745; header();
    };
    header();
    fill(45, y - 60, 522, 70, "0.95 0.97 0.99");
    addText(56, y - 8, "Cash and Bank", 10, true);
    right(dollars(report.cashOnHandCents), y - 8, true);
    addText(56, y - 27, "To be received", 10);
    right(dollars(report.accountsReceivableCents), y - 27);
    addText(56, y - 47, "Total Invoices and Donations", 11, true);
    right(dollars(report.totalInvoicesDonationsCents), y - 47, true);
    y -= 88;
    addText(45, y, "ACCOUNTS", 10, true);
    right(report.asOf, y, true);
    y -= 21;
    for (const row of balanceSheetRows(report, view === "details")) {
        if (y < 90) nextPage();
        const section = row.amount === null &&
            ["Invoices & Donations", "Cash and Bank", "Other Invoices & Donations"].includes(row.label);
        if (section) {
            fill(45, y - 15, 522, 27, row.level === 0 ? "0.86 0.91 0.95" : "0.94 0.97 0.99");
            addText(55 + row.level * 13, y - 5, row.label, 11, true);
            y -= 32;
            continue;
        }
        const bold = row.label.startsWith("Total ");
        const amount = row.amount === null ? "N/A*" : dollars(row.amount);
        addText(56 + row.level * 17, y - 2, row.label, 10, bold);
        right(amount, y - 2, bold);
        rule(y - 13); y -= 30;
    }
    y -= 8;
    const info = "Calculated Cash and Bank (not a reconciled bank balance): " +
        dollars(report.netRecordedCashMovementCents);
    if (y < 95) nextPage();
    addText(45, y, info, 9); y -= 25;
    if (y < 115) nextPage();
    addText(45, y, "REPORT DATA NOTES", 10, true); y -= 17;
    for (const note of report.notes) {
        const words = note.split(/\s+/);
        let line = "";
        const noteLines: string[] = [];
        for (const word of words) {
            if (line && line.length + word.length + 1 > 93) {
                noteLines.push(line); line = word;
            } else line = line ? line + " " + word : word;
        }
        if (line) noteLines.push(line);
        for (const entry of noteLines) {
            if (y < 65) nextPage();
            addText(45, y, entry, 8); y -= 11;
        }
        y -= 6;
    }
    pages.push(commands);
    const objects: string[] = [];
    const add = (item: string) => { objects.push(item); return objects.length; };
    const catalogId = add("");
    const pagesId = add("");
    const normalFont = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const boldFont = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
    const pageIds: number[] = [];
    for (const lines of pages) {
        const stream = lines.join("\n") + "\n";
        const contentId = add("<< /Length " + Buffer.byteLength(stream, "ascii") +
            " >>\nstream\n" + stream + "endstream");
        const pageId = add("<< /Type /Page /Parent " + pagesId +
            " 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 " + normalFont +
            " 0 R /F2 " + boldFont + " 0 R >> >> /Contents " + contentId + " 0 R >>");
        pageIds.push(pageId);
    }
    objects[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
    objects[pagesId - 1] = "<< /Type /Pages /Kids [" +
        pageIds.map(id => id + " 0 R").join(" ") + "] /Count " + pageIds.length + " >>";
    let output = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((item, i) => {
        offsets.push(Buffer.byteLength(output, "ascii"));
        output += (i + 1) + " 0 obj\n" + item + "\nendobj\n";
    });
    const xref = Buffer.byteLength(output, "ascii");
    output += "xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n";
    for (const offset of offsets.slice(1))
        output += String(offset).padStart(10, "0") + " 00000 n \n";
    output += "trailer << /Size " + (objects.length + 1) + " /Root " +
        catalogId + " 0 R >>\nstartxref\n" + xref + "\n%%EOF";
    return Buffer.from(output, "ascii");
}

export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;
    if (!token) return NextResponse.json({error:"Unauthorized"},{status:401});
    try { const user=verifyAdminToken(token);
        if (!["admin","treasurer"].includes(user.role)) return NextResponse.json({error:"Forbidden"},{status:403});
    } catch {return NextResponse.json({error:"Unauthorized"},{status:401});}
    const {searchParams}=new URL(req.url);
    const asOf=searchParams.get("asOf")||"";
    const type=searchParams.get("type")||"accrual";
    const view=searchParams.get("view")||"summary";
    const format=searchParams.get("format")||"csv";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || !["cash","accrual"].includes(type)
        || !["summary","details"].includes(view) || !["csv","pdf"].includes(format))
        return NextResponse.json({error:"Invalid export filters."},{status:400});
    try {
        const report=await getInvoicesDonationsBalanceSheet(asOf,type as BalanceSheetType);
        const fileName=`glitz-invoices-donations-${asOf}-${view}.${format}`;
        if(format==="csv") return new NextResponse(makeCsv(report,view as "summary"|"details"),{
            headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${fileName}"`,"Cache-Control":"no-store"}
        });
        const bytes=makePdf(report,view as "summary"|"details");
        return new NextResponse(new Uint8Array(bytes),{
            headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${fileName}"`,"Cache-Control":"no-store"}
        });
    } catch(error) {
        console.error("Balance Sheet export error",error);
        return NextResponse.json({error:"Failed to export Balance Sheet."},{status:500});
    }
}
