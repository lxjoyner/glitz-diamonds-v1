import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import { getInvoicesDonationsBalanceSheet, type BalanceSheetType } from "@/lib/invoices-donations-balance-sheet";
import { balanceSheetRows } from "@/lib/balance-sheet-rows";

const dollars = (cents: number) => new Intl.NumberFormat("en-US", {style:"currency",currency:"USD"}).format(cents / 100);
const csvQuote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

function makeCsv(report: Awaited<ReturnType<typeof getInvoicesDonationsBalanceSheet>>, view: "summary" | "details") {
    const lines = [
        ["Glitz Of Diamonds - Balance Sheet"],
        [`As of ${report.asOf}`],
        [`Report Type: ${report.reportType === "accrual" ? "Accrual (Paid & Unpaid)" : "Cash Basis (Recorded Payments)"}`],
        [`View: ${view}`],
        [],
        ["Cash and Bank*", report.hasVerifiedCashBalance ? dollars(report.cashOnHandCents) : "N/A*"],
        ["To be received", dollars(report.accountsReceivableCents)],
        ["Total Invoices and Donations", report.hasVerifiedCashBalance ? dollars(report.totalInvoicesDonationsCents) : "N/A*"],
        [],
        ["ACCOUNTS", report.asOf],
        ...balanceSheetRows(report, view === "details").map(row => [
            `${"  ".repeat(row.level)}${row.label}`, row.amount == null ? (row.label.includes("Cash") || row.label === "Total Invoices and Donations" ? "N/A*" : "") : dollars(row.amount),
        ]),
        [],
        ["Net recorded cash movement (not an account balance)", dollars(report.netRecordedCashMovementCents)],
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
    // Minimal PDF writer avoids an extra library dependency on production.
    // Single-column text content respects the source document's hierarchy and
    // includes the same detailed notes as CSV and the browser report.
    const pageRows = [
        "Glitz Of Diamonds",
        "Balance Sheet - Invoices & Donations",
        `As of ${report.asOf}  |  ${report.reportType === "accrual" ? "Accrual (Paid & Unpaid)" : "Cash Basis (Recorded Payments)"}  |  ${view}`,
        "",
        `Cash and Bank*                     ${report.hasVerifiedCashBalance ? dollars(report.cashOnHandCents) : "N/A*"}`,
        `To be received                    ${dollars(report.accountsReceivableCents)}`,
        `Total Invoices and Donations      ${report.hasVerifiedCashBalance ? dollars(report.totalInvoicesDonationsCents) : "N/A*"}`,
        "",
        "ACCOUNTS",
        ...balanceSheetRows(report, view === "details").map(row =>
            `${"  ".repeat(row.level)}${row.label}${row.amount === null ? ((row.label.includes("Cash") || row.label === "Total Invoices and Donations") ? "  N/A*" : "") : "  " + dollars(row.amount)}`
        ),
        "",
        `Net recorded cash movement (not an account balance): ${dollars(report.netRecordedCashMovementCents)}`,
        "REPORT DATA NOTES",
        ...report.notes,
    ];
    const wrap = (text: string, len = 85) => {
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let line = "";
        for (const word of words) {
            if (line && line.length + word.length + 1 > len) { lines.push(line); line = word; }
            else line = line ? line + " " + word : word;
        }
        if (line) lines.push(line);
        return lines;
    };
    const lines = pageRows.flatMap(row => wrap(row));
    const maxPerPage = 48;
    const pages: string[][] = [];
    for (let i=0;i<lines.length;i+=maxPerPage) pages.push(lines.slice(i,i+maxPerPage));
    if (!pages.length) pages.push([]);
    const objects: string[] = [];
    const add = (obj: string) => {objects.push(obj);return objects.length;};
    const catalog = add("");
    const pagesId = add("");
    const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    const pageIds: number[] = [];
    for (const entries of pages) {
        let stream = "BT /F1 10 Tf 45 746 Td 14 TL\n";
        for(const entry of entries){stream += `(${pdfEscape(entry)}) Tj T*\n`;}
        stream += "ET";
        const byteLength = Buffer.byteLength(stream, "ascii");
        const contentId = add(`<< /Length ${byteLength} >>\nstream\n${stream}\nendstream`);
        const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
        pageIds.push(pageId);
    }
    objects[catalog-1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId-1] = `<< /Type /Pages /Kids [${pageIds.map(n=>n+" 0 R").join(" ")}] /Count ${pageIds.length} >>`;
    let out = "%PDF-1.4\n";
    const offsets=[0];
    objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(out,"ascii"));out += `${i+1} 0 obj\n${obj}\nendobj\n`;});
    const xrefStart=Buffer.byteLength(out,"ascii");
    out += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
    for(const offset of offsets.slice(1)) out += `${String(offset).padStart(10,"0")} 00000 n \n`;
    out += `trailer << /Size ${objects.length+1} /Root ${catalog} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(out, "ascii");
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
