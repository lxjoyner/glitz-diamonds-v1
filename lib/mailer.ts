import nodemailer from "nodemailer";
import { writeEmailLog } from "@/lib/email-log";

function firstNonEmptyEnv(keys: string[]): string | undefined {
    for (const key of keys) {
        const value = process.env[key];
        if (value && value.trim()) return value.trim();
    }

    return undefined;
}

function resolveSmtpConfig() {
    const host = firstNonEmptyEnv(["SMTP_HOST"]) || (firstNonEmptyEnv(["EMAIL_USERW", "EMAIL_PASSW"]) ? "smtp.hostinger.com" : undefined);
    const port = firstNonEmptyEnv(["SMTP_PORT"]) || (host === "smtp.hostinger.com" ? "465" : undefined);
    const user = firstNonEmptyEnv(["SMTP_USER", "EMAIL_USERW", "EMAIL_USER"]);
    const pass = firstNonEmptyEnv(["SMTP_PASS", "EMAIL_PASSW", "EMAIL_PASS"]);
    const fromEmail = firstNonEmptyEnv(["PASSWORD_RESET_FROM_EMAIL", "CONTACT_TO_WEMAIL", "SMTP_USER", "EMAIL_USERW", "EMAIL_USER"]);
    const secureEnv = firstNonEmptyEnv(["SMTP_SECURE"]);
    const secure = secureEnv ? secureEnv.toLowerCase() === "true" : port === "465";

    return { host, port, user, pass, fromEmail, secure };
}

export function getMissingSmtpConfigKeys(): string[] {
    const smtp = resolveSmtpConfig();
    const missing: string[] = [];

    if (!smtp.host) missing.push("SMTP_HOST");
    if (!smtp.port) missing.push("SMTP_PORT");
    if (!smtp.user) missing.push("SMTP_USER");
    if (!smtp.pass) missing.push("SMTP_PASS");
    if (!smtp.fromEmail) missing.push("PASSWORD_RESET_FROM_EMAIL");

    return missing;
}

export function hasSmtpConfig(): boolean {
    return getMissingSmtpConfigKeys().length === 0;
}

export function getFromEmailAddress(): string {
    const smtp = resolveSmtpConfig();

    if (!smtp.fromEmail) {
        throw new Error("Missing environment variable: PASSWORD_RESET_FROM_EMAIL");
    }

    return smtp.fromEmail;
}

export function getSmtpTransport() {
    const smtp = resolveSmtpConfig();

    if (!smtp.host) throw new Error("Missing environment variable: SMTP_HOST");
    if (!smtp.port) throw new Error("Missing environment variable: SMTP_PORT");
    if (!smtp.user) throw new Error("Missing environment variable: SMTP_USER");
    if (!smtp.pass) throw new Error("Missing environment variable: SMTP_PASS");

    return nodemailer.createTransport({
        host: smtp.host,
        port: Number(smtp.port),
        secure: smtp.secure,
        auth: {
            user: smtp.user,
            pass: smtp.pass,
        },
    });
}

export async function sendInvoiceEmail(params: {
    toEmail: string;
    memberName: string;
    invoiceNumber: string;
    amountDueCents: number;
    dueDate: string;
    invoiceUrl: string;
    overdue?: {
        rows: Array<{ year: number; month: number; amountDueCents: number }>;
        totalCents: number;
    };
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        writeEmailLog({
            channel: "invoice",
            status: "skipped",
            to: params.toEmail,
            reason: "missing_smtp_config",
            details: { missingEnv: missingSmtpKeys },
        });
        throw new Error(`SMTP config is incomplete: ${missingSmtpKeys.join(", ")}`);
    }

    const amountDue = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(params.amountDueCents / 100);
    const dueDate = new Date(params.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const subject = `Glitz Of Diamonds invoice ${params.invoiceNumber}`;
    const membershipPolicy = "Please be advised that if your account becomes three (3) payments past due, your membership will be temporarily deactivated. Membership privileges will be restored once all outstanding payments have been received and your account is brought current.\n\nThank you for your understanding and for being a valued member of the Glitz Of Diamonds Women’s Group.";
    const overdueMoney = (cents: number) => new Intl.NumberFormat("en-US", {
        style: "currency", currency: "USD",
    }).format(cents / 100);
    const overdueRows = params.overdue?.rows || [];
    const overdueText = overdueRows.length > 0
        ? "\nOver Due Invoice Payments\nYear  Month  Amount Due\n" +
          overdueRows.map((row) => `${row.year}  ${new Date(Date.UTC(2000, row.month - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })}  ${overdueMoney(row.amountDueCents)}`).join("\n") +
          `\nTotal Over Due: ${overdueMoney(params.overdue?.totalCents || 0)}\n`
        : "";
    const overdueHtml = overdueRows.length > 0
        ? `<div style="margin:22px 0;max-width:380px">
            <table style="width:100%;border-collapse:collapse;font:14px Arial,sans-serif;border:1px solid #1f2937">
                <thead>
                    <tr><th colspan="3" style="background:#161616;color:white;padding:8px;text-align:center">Over Due Invoice Payments</th></tr>
                    <tr style="background:#f1f5f9">
                        <th style="padding:7px;border:1px solid #ddd">Year</th>
                        <th style="padding:7px;border:1px solid #ddd">Month</th>
                        <th style="padding:7px;border:1px solid #ddd;text-align:right">Amount Due</th>
                    </tr>
                </thead>
                <tbody>${overdueRows.map((row) => `<tr>
                    <td style="padding:7px;border:1px solid #ddd;text-align:center">${row.year}</td>
                    <td style="padding:7px;border:1px solid #ddd;text-align:center">${new Date(Date.UTC(2000, row.month - 1, 1)).toLocaleString("en-US", { month: "long", timeZone: "UTC" })}</td>
                    <td style="padding:7px;border:1px solid #ddd;text-align:right">${overdueMoney(row.amountDueCents)}</td>
                </tr>`).join("")}
                    <tr style="background:#ef1717;color:#fff;font-weight:bold">
                        <td colspan="2" style="padding:9px">Total Over Due</td>
                        <td style="padding:9px;text-align:right">${overdueMoney(params.overdue?.totalCents || 0)}</td>
                    </tr>
                </tbody>
            </table>
            <p style="font-size:12px;color:#64748b">This amount covers older overdue invoices only. Your new invoice amount is shown separately above.</p>
        </div>`
        : "";


    writeEmailLog({ channel: "invoice", status: "attempt", to: params.toEmail, subject });

    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hello ${params.memberName},\n\nYou have a new invoice from Glitz Of Diamonds.\n\n${membershipPolicy}\n\nInvoice: ${params.invoiceNumber}\nAmount Due: ${amountDue}\nDue Date: ${dueDate}\n${overdueText}\nView your invoice:\n${params.invoiceUrl}\n\nThank you,\nGlitz Of Diamonds`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><h2>Glitz Of Diamonds</h2><p>Hello ${params.memberName},</p><p>You have a new invoice from Glitz Of Diamonds.</p><p>Please be advised that if your account becomes three (3) payments past due, your membership will be temporarily deactivated. Membership privileges will be restored once all outstanding payments have been received and your account is brought current.</p><p>Thank you for your understanding and for being a valued member of the Glitz Of Diamonds Women’s Group.</p><p><strong>Invoice:</strong> ${params.invoiceNumber}<br/><strong>Amount Due:</strong> ${amountDue}<br/><strong>Due Date:</strong> ${dueDate}</p>${overdueHtml}<p style="margin:28px 0"><a href="${params.invoiceUrl}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">View Invoice</a></p><p>Thank you,<br/>Glitz Of Diamonds</p></div>`,
        });
        writeEmailLog({ channel: "invoice", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "invoice", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendAdminPasswordResetEmail(params: {
    toEmail: string;
    username: string;
    resetUrl: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping admin password-reset email dispatch.`);
        writeEmailLog({ channel: "admin-password-reset", status: "skipped", to: params.toEmail, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }
    const subject = "Reset your Glitz admin password";
    writeEmailLog({ channel: "admin-password-reset", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(), to: params.toEmail, subject,
            text: `Hi ${params.username},\n\nYour admin password has reached the 60-day rotation window. Reset it using this link:\n${params.resetUrl}\n\nIf you did not request this, contact your system administrator immediately.`,
            html: `<p>Hi ${params.username},</p><p>Your admin password has reached the 60-day rotation window.</p><p>Reset it using this link:</p><p><a href="${params.resetUrl}">${params.resetUrl}</a></p><p>If you did not request this, contact your system administrator immediately.</p>`,
        });
        writeEmailLog({ channel: "admin-password-reset", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "admin-password-reset", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendAdminTemporaryPasswordEmail(params: { toEmail: string; username: string; temporaryPassword: string; }) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping admin temporary-password email dispatch.`);
        writeEmailLog({ channel: "admin-temporary-password", status: "skipped", to: params.toEmail, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }
    const subject = "Your Glitz temporary password";
    writeEmailLog({ channel: "admin-temporary-password", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(), to: params.toEmail, subject,
            text: `Hi ${params.username},\n\nA temporary password was requested for your account.\n\nTemporary password: ${params.temporaryPassword}\n\nSign in with this temporary password, then immediately use Change Password to set a new one.`,
            html: `<p>Hi ${params.username},</p><p>A temporary password was requested for your account.</p><p><strong>Temporary password:</strong> ${params.temporaryPassword}</p><p>Sign in with this temporary password, then immediately use <strong>Change Password</strong> to set a new one.</p>`,
        });
        writeEmailLog({ channel: "admin-temporary-password", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "admin-temporary-password", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendUsernameReminderEmail(params: { toEmail: string; username: string; }) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping username reminder email dispatch.`);
        writeEmailLog({ channel: "username-reminder", status: "skipped", to: params.toEmail, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }
    const subject = "Your Glitz username reminder";
    writeEmailLog({ channel: "username-reminder", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(), to: params.toEmail, subject,
            text: `A request was made to recover your username.\n\nYour username is: ${params.username}\n\nIf you did not request this, you can ignore this email.`,
            html: `<p>A request was made to recover your username.</p><p><strong>Your username is: ${params.username}</strong></p><p>If you did not request this, you can ignore this email.</p>`,
        });
        writeEmailLog({ channel: "username-reminder", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "username-reminder", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendAdminLoginVerificationCodeEmail(params: { toEmail: string; username: string; verificationCode: string; }) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping login verification code email dispatch.`);
        writeEmailLog({ channel: "admin-login-2fa", status: "skipped", to: params.toEmail, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }
    const subject = "Your Glitz login verification code";
    writeEmailLog({ channel: "admin-login-2fa", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(), to: params.toEmail, subject,
            text: `Hi ${params.username},\n\nYour verification code is: ${params.verificationCode}\n\nThis code expires in 10 minutes. If you did not try to sign in, ignore this email.`,
            html: `<p>Hi ${params.username},</p><p>Your verification code is:</p><p><strong style="font-size:22px;letter-spacing:4px;">${params.verificationCode}</strong></p><p>This code expires in 10 minutes. If you did not try to sign in, ignore this email.</p>`,
        });
        writeEmailLog({ channel: "admin-login-2fa", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "admin-login-2fa", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendMemberRegistrationNotification(params: { toEmails: string[]; fullName: string; username: string; email: string; address: string; tshirtSize: string; favoriteColor: string; jacketSize: string; gender: string; birthday: string; }) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping member registration email dispatch.`);
        writeEmailLog({ channel: "member-registration-notification", status: "skipped", to: params.toEmails, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }
    if (!params.toEmails.length) {
        writeEmailLog({ channel: "member-registration-notification", status: "skipped", reason: "missing_admin_email" });
        return { sent: false as const, reason: "missing_admin_email" as const };
    }
    const subject = "New member registration submitted";
    const to = params.toEmails.join(", ");
    writeEmailLog({ channel: "member-registration-notification", status: "attempt", to: params.toEmails, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(), to, subject,
            text: `A new user registered as Member.\n\nName: ${params.fullName}\nUsername: ${params.username}\nEmail: ${params.email}\nAddress: ${params.address}\nT-Shirt Size: ${params.tshirtSize}\nFavorite Color: ${params.favoriteColor}\nJacket Size: ${params.jacketSize}\nGender: ${params.gender}\nBirthday (MMDD): ${params.birthday}`,
            html: `<p>A new user registered as <strong>Member</strong>.</p><ul><li><strong>Name:</strong> ${params.fullName}</li><li><strong>Username:</strong> ${params.username}</li><li><strong>Email:</strong> ${params.email}</li><li><strong>Address:</strong> ${params.address}</li><li><strong>T-Shirt Size:</strong> ${params.tshirtSize}</li><li><strong>Favorite Color:</strong> ${params.favoriteColor}</li><li><strong>Jacket Size:</strong> ${params.jacketSize}</li><li><strong>Gender:</strong> ${params.gender}</li><li><strong>Birthday (MMDD):</strong> ${params.birthday}</li></ul>`,
        });
        writeEmailLog({ channel: "member-registration-notification", status: "success", to: params.toEmails, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "member-registration-notification", status: "error", to: params.toEmails, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendMemberRegistrationConfirmation(params: { toEmail: string; fullName: string; }) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping member registration confirmation email.`);
        writeEmailLog({ channel: "member-registration-confirmation", status: "skipped", to: params.toEmail, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }
    const subject = "Your Glitz registration is complete";
    writeEmailLog({ channel: "member-registration-confirmation", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(), to: params.toEmail, subject,
            text: `Hi ${params.fullName},\n\nThank you for registering with Glitz of Diamonds. Your registration has been completed successfully and your member account is now active.\n\nIf you have any questions, please reply to this email.\n\n- Glitz of Diamonds`,
            html: `<p>Hi ${params.fullName},</p><p>Thank you for registering with <strong>Glitz of Diamonds</strong>. Your registration has been completed successfully and your member account is now active.</p><p>If you have any questions, please reply to this email.</p><p>- Glitz of Diamonds</p>`,
        });
        writeEmailLog({ channel: "member-registration-confirmation", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "member-registration-confirmation", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendMemberInviteEmail(params: {
    toEmail: string;
    firstName: string;
    invitedBy: string;
    inviteLink: string;
    trackingPixelUrl?: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping member invite email dispatch.`);
        writeEmailLog({ channel: "member-invite", status: "skipped", to: params.toEmail, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }
    const subject = "Your Glitz of Diamonds member invite";
    writeEmailLog({ channel: "member-invite", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        const trackingPixel = params.trackingPixelUrl
            ? `<img src="${params.trackingPixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;opacity:0" />`
            : "";
        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hi ${params.firstName},\n\n${params.invitedBy} invited you to register as a member at Glitz of Diamonds.\n\nUse this one-time registration link:\n${params.inviteLink}\n\nThis link becomes inactive after registration is submitted.`,
            html: `<p>Hi ${params.firstName},</p><p><strong>${params.invitedBy}</strong> invited you to register as a member at Glitz of Diamonds.</p><p>Use this one-time registration link:</p><p><a href="${params.inviteLink}">${params.inviteLink}</a></p><p>This link becomes inactive after registration is submitted.</p>${trackingPixel}`,
        });
        writeEmailLog({ channel: "member-invite", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "member-invite", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        return { sent: false as const, reason: "send_failed" as const };
    }
}

export async function sendMemberInviteAdminCopyEmail(params: {
    toEmail: string;
    invitedBy: string;
    inviteeName: string;
    inviteeEmail: string;
    inviteePhone: string;
    inviteLink: string;
    inviteDelivered: boolean;
}) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const subject = `Copy of member invite sent to ${params.inviteeName}`;
    const deliveryText = params.inviteDelivered ? "The invite email was sent successfully." : "The invite email could not be sent automatically.";
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hi ${params.invitedBy},\n\n${deliveryText}\n\nInvitee: ${params.inviteeName}\nEmail: ${params.inviteeEmail}\nPhone: ${params.inviteePhone}\n\nThe invitee was sent this registration link:\n${params.inviteLink}`,
            html: `<p>Hi ${params.invitedBy},</p><p>${deliveryText}</p><p><strong>Invitee:</strong> ${params.inviteeName}<br/><strong>Email:</strong> ${params.inviteeEmail}<br/><strong>Phone:</strong> ${params.inviteePhone}</p><p>The invitee was sent this registration link:</p><p><a href="${params.inviteLink}">${params.inviteLink}</a></p>`,
        });
        return { sent: true as const };
    } catch (error) {
        console.error("Failed to send member invite admin copy email:", error);
        return { sent: false as const, reason: "send_failed" as const };
    }
}


type InvoiceReceiptEmailParams = {
    toEmail: string;
    customerName: string;
    businessName: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
    invoiceNumber: string;
    invoiceDate: string | Date;
    paymentDate: string | null;
    paymentMethod: string | null;
    paymentAmountCents: number;
    paidToDateCents: number;
    totalCents: number;
    remainingCents: number;
    historical: boolean;
    memo: string | null;
    footerText: string;
    items: Array<{
        description: string;
        quantity: number;
        unitPriceCents: number;
        lineTotalCents: number;
    }>;
    invoiceUrl: string | null;
    logo: { data: Buffer; mimeType: string } | null;
};

function escapeReceiptHtml(value: string | number) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
        .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function receiptHtmlLines(value: string) {
    return escapeReceiptHtml(value).replace(/\r?\n/g, "<br/>");
}

function receiptMoney(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function receiptDate(value: string | Date | null) {
    if (!value) return "Not recorded";
    let date: Date;
    if (value instanceof Date) {
        date = value;
    } else {
        const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return String(value);
        date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Email the actual recorded payment, not the full invoice amount a second time. */
export async function sendInvoiceReceiptEmail(params: InvoiceReceiptEmailParams) {
    const subject = `Glitz Of Diamonds - Receipt of Payment - ${params.invoiceNumber}`;
    if (!hasSmtpConfig()) {
        const missing = getMissingSmtpConfigKeys();
        writeEmailLog({
            channel: "invoice-receipt", status: "skipped", to: params.toEmail, subject,
            reason: "missing_smtp_config", details: { missingEnv: missing },
        });
        throw new Error(`SMTP config is incomplete: ${missing.join(", ")}`);
    }

    const paymentLabel = params.historical ? "Previously recorded payment" : "Payment received";
    const dateLabel = params.historical ? "Payment date: Not recorded (historical import)"
        : `Payment date: ${receiptDate(params.paymentDate)}`;
    const logoCid = "glitz-invoice-receipt-logo";
    const brandLogo = params.logo
        ? `<img src="cid:${logoCid}" alt="Glitz Of Diamonds logo" style="max-height:76px;max-width:210px;object-fit:contain"/>`
        : "";
    const itemRows = params.items.map((item) =>
        `<tr><td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeReceiptHtml(item.description)}</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right">${escapeReceiptHtml(item.quantity)}</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right">${receiptMoney(item.unitPriceCents)}</td>` +
        `<td style="padding:10px;border-bottom:1px solid #e2e8f0;text-align:right">${receiptMoney(item.lineTotalCents)}</td></tr>`
    ).join("");
    const viewLink = params.invoiceUrl
        ? `<p style="margin:26px 0"><a href="${escapeReceiptHtml(params.invoiceUrl)}" style="background:#1d4ed8;color:white;text-decoration:none;padding:12px 18px;border-radius:7px">View original invoice</a></p>`
        : "";
    const html = `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:740px;margin:auto;line-height:1.5">
        <div style="border-bottom:2px solid #111827;padding:20px 0;display:flex;align-items:center;gap:16px">
            ${brandLogo}
            <div><h1 style="margin:0;font-size:24px">${escapeReceiptHtml(params.businessName)}</h1>
            <h2 style="margin:4px 0;color:#166534;font-size:20px">RECEIPT OF PAYMENT</h2></div>
        </div>
        <p>Hello ${escapeReceiptHtml(params.customerName)},</p>
        <p>Thank you for your payment. ${params.historical ? "This acknowledgement reflects a payment recorded in imported historical invoice records; the exact payment date and method were not retained." : "We have received the following payment toward your invoice."}</p>
        <table style="width:100%;border-collapse:collapse;margin:18px 0">
            <tr><td><strong>Invoice number:</strong></td><td>${escapeReceiptHtml(params.invoiceNumber)}</td></tr>
            <tr><td><strong>Invoice date:</strong></td><td>${receiptDate(params.invoiceDate)}</td></tr>
            <tr><td><strong>${params.historical ? "Historical payment date:" : "Payment date:"}</strong></td><td>${params.historical ? "Not recorded" : receiptDate(params.paymentDate)}</td></tr>
            ${params.paymentMethod ? `<tr><td><strong>Payment method:</strong></td><td>${escapeReceiptHtml(params.paymentMethod)}</td></tr>` : ""}
        </table>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:18px;margin:16px 0">
            <p style="margin:0;font-size:14px">${paymentLabel}</p>
            <p style="font-size:28px;font-weight:bold;color:#166534;margin:3px 0">${receiptMoney(params.paymentAmountCents)}</p>
            <p style="margin:0;font-size:14px">Remaining invoice balance: ${receiptMoney(params.remainingCents)}</p>
        </div>
        <h3 style="margin-top:30px">Original invoice details</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr style="background:#f1f5f9"><th style="padding:10px;text-align:left">Description</th><th style="padding:10px;text-align:right">Qty</th><th style="padding:10px;text-align:right">Price</th><th style="padding:10px;text-align:right">Amount</th></tr></thead>
            <tbody>${itemRows}</tbody>
        </table>
        <div style="margin-top:18px;text-align:right">
            <p>Invoice total: <strong>${receiptMoney(params.totalCents)}</strong></p>
            <p>Paid to date: <strong>${receiptMoney(params.paidToDateCents)}</strong></p>
            <p>Remaining: <strong>${receiptMoney(params.remainingCents)}</strong></p>
        </div>
        ${params.memo ? `<p><strong>Payment memo:</strong> ${receiptHtmlLines(params.memo)}</p>` : ""}
        ${viewLink}
        ${params.footerText ? `<p style="border-top:1px solid #e2e8f0;padding-top:16px;color:#64748b;font-size:13px">${receiptHtmlLines(params.footerText)}</p>` : ""}
        <p style="font-size:13px;color:#64748b">${[params.businessAddress, params.businessPhone, params.businessEmail].filter(Boolean).map(receiptHtmlLines).join("<br/>")}</p>
        <p>Thank you,<br/>Glitz Of Diamonds</p>
    </div>`;

    const text = [
        params.businessName, "RECEIPT OF PAYMENT", "",
        `Hello ${params.customerName},`, "Thank you for your payment.", "",
        `Invoice: ${params.invoiceNumber}`,
        `Invoice date: ${receiptDate(params.invoiceDate)}`,
        dateLabel,
        ...(params.paymentMethod ? [`Payment method: ${params.paymentMethod}`] : []),
        `${paymentLabel}: ${receiptMoney(params.paymentAmountCents)}`,
        `Invoice total: ${receiptMoney(params.totalCents)}`,
        `Paid to date: ${receiptMoney(params.paidToDateCents)}`,
        `Remaining balance: ${receiptMoney(params.remainingCents)}`,
        ...(params.memo ? [`Payment memo: ${params.memo}`] : []),
        ...(params.invoiceUrl ? [`View original invoice: ${params.invoiceUrl}`] : []),
        ...(params.footerText ? ["", params.footerText] : []),
        "", "Thank you,", "Glitz Of Diamonds",
    ].join("\n");

    writeEmailLog({ channel: "invoice-receipt", status: "attempt", to: params.toEmail, subject });
    try {
        const transport = getSmtpTransport();
        await transport.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text,
            html,
            attachments: params.logo ? [{
                filename: "glitz-logo",
                content: params.logo.data,
                contentType: params.logo.mimeType,
                cid: logoCid,
                contentDisposition: "inline",
            }] : [],
        });
        writeEmailLog({ channel: "invoice-receipt", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "invoice-receipt", status: "error", to: params.toEmail, subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}
