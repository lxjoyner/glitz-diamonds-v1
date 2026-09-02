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

function money(cents: number) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

export async function sendInvoiceEmail(params: {
    toEmail: string;
    memberName: string;
    invoiceNumber: string;
    amountDueCents: number;
    dueDate: string;
    invoiceUrl: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        writeEmailLog({ channel: "invoice", status: "skipped", to: params.toEmail, reason: "missing_smtp_config", details: { missingEnv: missingSmtpKeys } });
        throw new Error(`SMTP config is incomplete: ${missingSmtpKeys.join(", ")}`);
    }

    const amountDue = money(params.amountDueCents);
    const dueDate = new Date(params.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const subject = `Glitz Of Diamonds invoice ${params.invoiceNumber}`;

    writeEmailLog({ channel: "invoice", status: "attempt", to: params.toEmail, subject });

    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hello ${params.memberName},\n\nYou have a new invoice from Glitz Of Diamonds.\n\nInvoice: ${params.invoiceNumber}\nAmount Due: ${amountDue}\nDue Date: ${dueDate}\n\nView your invoice:\n${params.invoiceUrl}\n\nThank you,\nGlitz Of Diamonds`,
            html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937"><h2>Glitz Of Diamonds</h2><p>Hello ${params.memberName},</p><p>You have a new invoice from Glitz Of Diamonds.</p><p><strong>Invoice:</strong> ${params.invoiceNumber}<br/><strong>Amount Due:</strong> ${amountDue}<br/><strong>Due Date:</strong> ${dueDate}</p><p style="margin:28px 0"><a href="${params.invoiceUrl}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">View Invoice</a></p><p>Thank you,<br/>Glitz Of Diamonds</p></div>`,
        });
        writeEmailLog({ channel: "invoice", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "invoice", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendInvoicePaymentReceipt(params: {
    toEmail: string;
    memberName: string;
    invoiceNumber: string;
    paymentAmountCents: number;
    remainingBalanceCents: number;
}) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const subject = `Payment received for invoice ${params.invoiceNumber}`;
    writeEmailLog({ channel: "invoice-payment-receipt", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hi ${params.memberName},\n\nWe received your payment of ${money(params.paymentAmountCents)} for invoice ${params.invoiceNumber}.\nRemaining balance: ${money(params.remainingBalanceCents)}.\n\nThank you,\nGlitz Of Diamonds`,
            html: `<p>Hi ${params.memberName},</p><p>We received your payment of <strong>${money(params.paymentAmountCents)}</strong> for invoice <strong>${params.invoiceNumber}</strong>.</p><p>Remaining balance: <strong>${money(params.remainingBalanceCents)}</strong>.</p><p>Thank you,<br/>Glitz Of Diamonds</p>`,
        });
        writeEmailLog({ channel: "invoice-payment-receipt", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "invoice-payment-receipt", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendInvoicePaymentNotification(params: {
    toEmails: string[];
    memberName: string;
    invoiceNumber: string;
    paymentAmountCents: number;
    totalPaidCents: number;
    invoiceTotalCents: number;
    status: string;
}) {
    if (!hasSmtpConfig() || params.toEmails.length === 0) return { sent: false as const, reason: "missing_config_or_recipient" as const };
    const subject = `Invoice payment received: ${params.invoiceNumber}`;
    writeEmailLog({ channel: "invoice-payment-admin", status: "attempt", to: params.toEmails, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmails.join(", "),
            subject,
            text: `${params.memberName} paid ${money(params.paymentAmountCents)} toward invoice ${params.invoiceNumber}.\nTotal paid: ${money(params.totalPaidCents)} of ${money(params.invoiceTotalCents)}.\nStatus: ${params.status}.`,
            html: `<p><strong>${params.memberName}</strong> paid <strong>${money(params.paymentAmountCents)}</strong> toward invoice <strong>${params.invoiceNumber}</strong>.</p><p>Total paid: ${money(params.totalPaidCents)} of ${money(params.invoiceTotalCents)}.</p><p>Status: <strong>${params.status}</strong>.</p>`,
        });
        writeEmailLog({ channel: "invoice-payment-admin", status: "success", to: params.toEmails, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "invoice-payment-admin", status: "error", to: params.toEmails, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendAdminPasswordResetEmail(params: { toEmail: string; username: string; resetUrl: string }) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const subject = "Reset your Glitz admin password";
    writeEmailLog({ channel: "admin-password-reset", status: "attempt", to: params.toEmail, subject });
    try {
        const transporter = getSmtpTransport();
        await transporter.sendMail({ from: getFromEmailAddress(), to: params.toEmail, subject, text: `Hi ${params.username},\n\nYour admin password has reached the 60-day rotation window. Reset it using this link:\n${params.resetUrl}\n\nIf you did not request this, contact your system administrator immediately.`, html: `<p>Hi ${params.username},</p><p>Your admin password has reached the 60-day rotation window.</p><p>Reset it using this link:</p><p><a href="${params.resetUrl}">${params.resetUrl}</a></p><p>If you did not request this, contact your system administrator immediately.</p>` });
        writeEmailLog({ channel: "admin-password-reset", status: "success", to: params.toEmail, subject });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({ channel: "admin-password-reset", status: "error", to: params.toEmail, subject, reason: error instanceof Error ? error.message : "unknown_error" });
        throw error;
    }
}

export async function sendAdminTemporaryPasswordEmail(params: { toEmail: string; username: string; temporaryPassword: string }) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const subject = "Your Glitz temporary password";
    const transporter = getSmtpTransport();
    await transporter.sendMail({ from: getFromEmailAddress(), to: params.toEmail, subject, text: `Hi ${params.username},\n\nA temporary password was requested for your account.\n\nTemporary password: ${params.temporaryPassword}\n\nSign in with this temporary password, then immediately use Change Password to set a new one.`, html: `<p>Hi ${params.username},</p><p>A temporary password was requested for your account.</p><p><strong>Temporary password:</strong> ${params.temporaryPassword}</p><p>Sign in with this temporary password, then immediately use <strong>Change Password</strong> to set a new one.</p>` });
    return { sent: true as const };
}

export async function sendUsernameReminderEmail(params: { toEmail: string; username: string }) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const transporter = getSmtpTransport();
    await transporter.sendMail({ from: getFromEmailAddress(), to: params.toEmail, subject: "Your Glitz username reminder", text: `A request was made to recover your username.\n\nYour username is: ${params.username}\n\nIf you did not request this, you can ignore this email.`, html: `<p>A request was made to recover your username.</p><p><strong>Your username is: ${params.username}</strong></p><p>If you did not request this, you can ignore this email.</p>` });
    return { sent: true as const };
}

export async function sendAdminLoginVerificationCodeEmail(params: { toEmail: string; username: string; verificationCode: string }) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const transporter = getSmtpTransport();
    await transporter.sendMail({ from: getFromEmailAddress(), to: params.toEmail, subject: "Your Glitz login verification code", text: `Hi ${params.username},\n\nYour verification code is: ${params.verificationCode}\n\nThis code expires in 10 minutes. If you did not try to sign in, ignore this email.`, html: `<p>Hi ${params.username},</p><p>Your verification code is:</p><p><strong style="font-size: 22px; letter-spacing: 4px;">${params.verificationCode}</strong></p><p>This code expires in 10 minutes. If you did not try to sign in, ignore this email.</p>` });
    return { sent: true as const };
}

export async function sendMemberRegistrationNotification(params: { toEmails: string[]; fullName: string; username: string; email: string; address: string; tshirtSize: string; favoriteColor: string; jacketSize: string; gender: string; birthday: string }) {
    if (!hasSmtpConfig() || !params.toEmails.length) return { sent: false as const, reason: "missing_config_or_recipient" as const };
    const transporter = getSmtpTransport();
    await transporter.sendMail({ from: getFromEmailAddress(), to: params.toEmails.join(", "), subject: "New member registration submitted", text: `A new user registered as Member.\n\nName: ${params.fullName}\nUsername: ${params.username}\nEmail: ${params.email}\nAddress: ${params.address}\nT-Shirt Size: ${params.tshirtSize}\nFavorite Color: ${params.favoriteColor}\nJacket Size: ${params.jacketSize}\nGender: ${params.gender}\nBirthday (MMDD): ${params.birthday}` });
    return { sent: true as const };
}

export async function sendMemberRegistrationConfirmation(params: { toEmail: string; fullName: string }) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const transporter = getSmtpTransport();
    await transporter.sendMail({ from: getFromEmailAddress(), to: params.toEmail, subject: "Your Glitz registration is complete", text: `Hi ${params.fullName},\n\nThank you for registering with Glitz of Diamonds. Your registration has been completed successfully and your member account is now active.\n\nIf you have any questions, please reply to this email.\n\n- Glitz of Diamonds` });
    return { sent: true as const };
}

export async function sendMemberInviteEmail(params: { toEmail: string; firstName: string; invitedBy: string; inviteLink: string }) {
    if (!hasSmtpConfig()) return { sent: false as const, reason: "missing_smtp_config" as const };
    const transporter = getSmtpTransport();
    try {
        await transporter.sendMail({ from: getFromEmailAddress(), to: params.toEmail, subject: "Your Glitz of Diamonds member invite", text: `Hi ${params.firstName},\n\n${params.invitedBy} invited you to register as a member at Glitz of Diamonds.\n\nUse this one-time registration link:\n${params.inviteLink}\n\nThis link becomes inactive after registration is submitted.`, html: `<p>Hi ${params.firstName},</p><p><strong>${params.invitedBy}</strong> invited you to register as a member at Glitz of Diamonds.</p><p>Use this one-time registration link:</p><p><a href="${params.inviteLink}">${params.inviteLink}</a></p><p>This link becomes inactive after registration is submitted.</p>` });
        return { sent: true as const };
    } catch {
        return { sent: false as const, reason: "send_failed" as const };
    }
}
