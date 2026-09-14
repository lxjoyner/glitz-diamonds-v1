import { NextRequest, NextResponse } from "next/server";
import { getInvoiceByPublicToken } from "@/lib/invoice-db";

function escapePdfText(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function money(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function buildPdf(lines: string[]) {
    const objects: string[] = [];
    const addObject = (body: string) => {
        objects.push(body);
        return objects.length;
    };

    const catalog = addObject("<< /Type /Catalog /Pages 2 0 R >>");
    void catalog;
    addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObject("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>");

    const contentLines = [
        "BT",
        "/F1 11 Tf",
        "50 750 Td",
        "14 TL",
        ...lines.flatMap((line, index) => index === 0 ? [`(${escapePdfText(line)}) Tj`] : ["T*", `(${escapePdfText(line)}) Tj`]),
        "ET",
    ];
    const content = contentLines.join("\n");
    addObject(`<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream`);
    addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((body, index) => {
        offsets.push(Buffer.byteLength(pdf, "utf8"));
        pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefOffset = Buffer.byteLength(pdf, "utf8");
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return Buffer.from(pdf, "utf8");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const invoice = await getInvoiceByPublicToken(token);

    if (!invoice) {
        return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const balance = Math.max(0, Number(invoice.total_cents) - Number(invoice.amount_paid_cents));
    const lines = [
        invoice.business_name || "Glitz Of Diamonds",
        `Invoice ${invoice.invoice_number}`,
        `Invoice date: ${new Date(invoice.invoice_date).toLocaleDateString()}`,
        `Due date: ${new Date(invoice.due_date).toLocaleDateString()}`,
        "",
        `Bill to: ${invoice.member_name}`,
        invoice.member_email || "",
        "",
        ...invoice.items.map((item) => `${item.description}  Qty ${Number(item.quantity)}  ${money(Number(item.line_total_cents))}`),
        "",
        `Subtotal: ${money(Number(invoice.subtotal_cents))}`,
        `Discount: -${money(Number(invoice.discount_cents))}`,
        `Tax: ${money(Number(invoice.tax_cents))}`,
        `Total: ${money(Number(invoice.total_cents))}`,
        `Amount due: ${money(balance)}`,
        invoice.notes ? `Notes: ${invoice.notes}` : "",
        invoice.terms ? `Payment terms: ${invoice.terms}` : "",
        invoice.footer_text || "",
    ].filter((line) => line !== "");

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
