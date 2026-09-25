import { NextRequest, NextResponse } from "next/server";
import { getInvoiceByPublicToken } from "@/lib/invoice-db";
import { getOverdueSummaryForInvoice } from "@/lib/invoice-overdue-summary";

function toPdfSafeText(value: string) {
    return value
        .normalize("NFKD")
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2013\u2014]/g, "-")
        .replace(/[\u2026]/g, "...")
        .replace(/[^\x20-\x7E]/g, "?");
}

function escapePdfText(value: string) {
    return toPdfSafeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(value: string, maxChars = 82) {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];

    const lines: string[] = [];
    let current = "";

    for (const word of words) {
        if (word.length > maxChars) {
            if (current) {
                lines.push(current);
                current = "";
            }
            for (let index = 0; index < word.length; index += maxChars) {
                lines.push(word.slice(index, index + maxChars));
            }
            continue;
        }

        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxChars) {
            if (current) lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }

    if (current) lines.push(current);
    return lines;
}

function money(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function buildPdf(lines: string[]) {
    const wrappedLines = lines.flatMap((line) => line === "" ? [""] : wrapText(line));
    const objects: string[] = [];
    const addObject = (body: string) => {
        objects.push(body);
        return objects.length;
    };

    const catalog = addObject("<< /Type /Catalog /Pages 2 0 R >>");
    void catalog;
    addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObject("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>");

    const visibleLines = wrappedLines.slice(0, 49);
    const contentLines = [
        "BT",
        "/F1 11 Tf",
        "50 750 Td",
        "14 TL",
        ...visibleLines.flatMap((line, index) => index === 0 ? [`(${escapePdfText(line)}) Tj`] : ["T*", `(${escapePdfText(line)}) Tj`]),
        "ET",
    ];
    const content = contentLines.join("\n");
    addObject(`<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`);
    addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, index) => {
        offsets.push(Buffer.byteLength(pdf, "latin1"));
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, "latin1");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const invoice = await getInvoiceByPublicToken(token);

    if (!invoice) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const balance = Math.max(0, Number(invoice.total_cents) - Number(invoice.amount_paid_cents));
    const overdue = await getOverdueSummaryForInvoice(invoice);
    const lines = [
        invoice.business_name || "Glitz Of Diamonds",
        `Invoice ${invoice.invoice_number}`,
        `Invoice date: ${new Date(invoice.invoice_date).toLocaleDateString()}`,
        `Due date: ${new Date(invoice.due_date).toLocaleDateString()}`,
        "",
        `Bill to: ${invoice.member_name}`,
        invoice.member_email || "",
        "",
        ...invoice.items.flatMap((item) => [
            `${item.description}`,
            `Qty ${Number(item.quantity)}  Price ${money(Number(item.unit_price_cents))}  Amount ${money(Number(item.line_total_cents))}`,
        ]),
        "",
        `Subtotal: ${money(Number(invoice.subtotal_cents))}`,
        `Discount: -${money(Number(invoice.discount_cents))}`,
        `Tax: ${money(Number(invoice.tax_cents))}`,
        `Total: ${money(Number(invoice.total_cents))}`,
        `Amount due: ${money(balance)}`,
        ...(overdue.rows.length ? [
            "",
            "OVER DUE INVOICE PAYMENTS",
            "Year     Month                Amount Due",
            ...overdue.rows.map((row) =>
                `${row.year}     ${new Date(Date.UTC(2000, row.month - 1, 1))
                    .toLocaleString("en-US", { month: "long", timeZone: "UTC" })
                    .padEnd(20)} ${money(row.amountDueCents)}`
            ),
            `TOTAL OVER DUE: ${money(overdue.totalCents)}`,
            "Previous overdue invoices only; current invoice amount is separate.",
        ] : []),
        invoice.notes ? `Notes: ${invoice.notes}` : "",
        invoice.terms ? `Payment terms: ${invoice.terms}` : "",
        invoice.footer_text || "",
    ].filter((line) => line !== "" || true);

    const pdf = buildPdf(lines);
    const filename = `${invoice.invoice_number || "invoice"}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "_");

    return new NextResponse(pdf, {
        status: 200,
        headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Cache-Control": "private, no-store",
        },
    });
}
