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

export async function sendAdminPasswordResetEmail(params: {
    toEmail: string;
    username: string;
    resetUrl: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(
            `SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping admin password-reset email dispatch.`
        );
        writeEmailLog({
            channel: "admin-password-reset",
            status: "skipped",
            to: params.toEmail,
            reason: "missing_smtp_config",
            details: { missingEnv: missingSmtpKeys },
        });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    const subject = "Reset your Glitz admin password";

    writeEmailLog({
        channel: "admin-password-reset",
        status: "attempt",
        to: params.toEmail,
        subject,
    });

    try {
        const transporter = getSmtpTransport();

        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hi ${params.username},\n\nYour admin password has reached the 60-day rotation window. Reset it using this link:\n${params.resetUrl}\n\nIf you did not request this, contact your system administrator immediately.`,
            html: `<p>Hi ${params.username},</p><p>Your admin password has reached the 60-day rotation window.</p><p>Reset it using this link:</p><p><a href="${params.resetUrl}">${params.resetUrl}</a></p><p>If you did not request this, contact your system administrator immediately.</p>`,
        });

        writeEmailLog({
            channel: "admin-password-reset",
            status: "success",
            to: params.toEmail,
            subject,
        });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "admin-password-reset",
            status: "error",
            to: params.toEmail,
            subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}

export async function sendAdminTemporaryPasswordEmail(params: {
    toEmail: string;
    username: string;
    temporaryPassword: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(
            `SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping admin temporary-password email dispatch.`
        );
        writeEmailLog({
            channel: "admin-temporary-password",
            status: "skipped",
            to: params.toEmail,
            reason: "missing_smtp_config",
            details: { missingEnv: missingSmtpKeys },
        });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    const subject = "Your Glitz temporary password";

    writeEmailLog({
        channel: "admin-temporary-password",
        status: "attempt",
        to: params.toEmail,
        subject,
    });

    try {
        const transporter = getSmtpTransport();

        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hi ${params.username},

A temporary password was requested for your account.

Temporary password: ${params.temporaryPassword}

Sign in with this temporary password, then immediately use Change Password to set a new one.`,
            html: `<p>Hi ${params.username},</p><p>A temporary password was requested for your account.</p><p><strong>Temporary password:</strong> ${params.temporaryPassword}</p><p>Sign in with this temporary password, then immediately use <strong>Change Password</strong> to set a new one.</p>`,
        });

        writeEmailLog({
            channel: "admin-temporary-password",
            status: "success",
            to: params.toEmail,
            subject,
        });

        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "admin-temporary-password",
            status: "error",
            to: params.toEmail,
            subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}

export async function sendUsernameReminderEmail(params: {
    toEmail: string;
    username: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(
            `SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping username reminder email dispatch.`
        );
        writeEmailLog({
            channel: "username-reminder",
            status: "skipped",
            to: params.toEmail,
            reason: "missing_smtp_config",
            details: { missingEnv: missingSmtpKeys },
        });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    const subject = "Your Glitz username reminder";

    writeEmailLog({
        channel: "username-reminder",
        status: "attempt",
        to: params.toEmail,
        subject,
    });

    try {
        const transporter = getSmtpTransport();

        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `A request was made to recover your username.\n\nYour username is: ${params.username}\n\nIf you did not request this, you can ignore this email.`,
            html: `<p>A request was made to recover your username.</p><p><strong>Your username is: ${params.username}</strong></p><p>If you did not request this, you can ignore this email.</p>`,
        });

        writeEmailLog({
            channel: "username-reminder",
            status: "success",
            to: params.toEmail,
            subject,
        });

        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "username-reminder",
            status: "error",
            to: params.toEmail,
            subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}

export async function sendAdminLoginVerificationCodeEmail(params: {
    toEmail: string;
    username: string;
    verificationCode: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(
            `SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping login verification code email dispatch.`
        );
        writeEmailLog({
            channel: "admin-login-2fa",
            status: "skipped",
            to: params.toEmail,
            reason: "missing_smtp_config",
            details: { missingEnv: missingSmtpKeys },
        });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    const subject = "Your Glitz login verification code";

    writeEmailLog({
        channel: "admin-login-2fa",
        status: "attempt",
        to: params.toEmail,
        subject,
    });

    try {
        const transporter = getSmtpTransport();

        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hi ${params.username},

Your verification code is: ${params.verificationCode}

This code expires in 10 minutes. If you did not try to sign in, ignore this email.`,
            html: `<p>Hi ${params.username},</p><p>Your verification code is:</p><p><strong style="font-size: 22px; letter-spacing: 4px;">${params.verificationCode}</strong></p><p>This code expires in 10 minutes. If you did not try to sign in, ignore this email.</p>`,
        });

        writeEmailLog({
            channel: "admin-login-2fa",
            status: "success",
            to: params.toEmail,
            subject,
        });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "admin-login-2fa",
            status: "error",
            to: params.toEmail,
            subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}

export async function sendMemberRegistrationNotification(params: {
    toEmails: string[];
    fullName: string;
    username: string;
    email: string;
    address: string;
    tshirtSize: string;
    favoriteColor: string;
    jacketSize: string;
    gender: string;
    birthday: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping member registration email dispatch.`);
        writeEmailLog({
            channel: "member-registration-notification",
            status: "skipped",
            to: params.toEmails,
            reason: "missing_smtp_config",
            details: { missingEnv: missingSmtpKeys },
        });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    if (!params.toEmails.length) {
        writeEmailLog({
            channel: "member-registration-notification",
            status: "skipped",
            reason: "missing_admin_email",
        });
        return { sent: false as const, reason: "missing_admin_email" as const };
    }

    const subject = "New member registration submitted";
    const to = params.toEmails.join(", ");

    writeEmailLog({
        channel: "member-registration-notification",
        status: "attempt",
        to: params.toEmails,
        subject,
    });

    try {
        const transporter = getSmtpTransport();

        await transporter.sendMail({
            from: getFromEmailAddress(),
            to,
            subject,
            text: `A new user registered as Member.\n\nName: ${params.fullName}\nUsername: ${params.username}\nEmail: ${params.email}\nAddress: ${params.address}\nT-Shirt Size: ${params.tshirtSize}\nFavorite Color: ${params.favoriteColor}\nJacket Size: ${params.jacketSize}\nGender: ${params.gender}\nBirthday (MMDD): ${params.birthday}`,
            html: `<p>A new user registered as <strong>Member</strong>.</p><ul><li><strong>Name:</strong> ${params.fullName}</li><li><strong>Username:</strong> ${params.username}</li><li><strong>Email:</strong> ${params.email}</li><li><strong>Address:</strong> ${params.address}</li><li><strong>T-Shirt Size:</strong> ${params.tshirtSize}</li><li><strong>Favorite Color:</strong> ${params.favoriteColor}</li><li><strong>Jacket Size:</strong> ${params.jacketSize}</li><li><strong>Gender:</strong> ${params.gender}</li><li><strong>Birthday (MMDD):</strong> ${params.birthday}</li></ul>`,
        });

        writeEmailLog({
            channel: "member-registration-notification",
            status: "success",
            to: params.toEmails,
            subject,
        });

        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "member-registration-notification",
            status: "error",
            to: params.toEmails,
            subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}

export async function sendMemberRegistrationConfirmation(params: {
    toEmail: string;
    fullName: string;
}) {
    if (!hasSmtpConfig()) {
        const missingSmtpKeys = getMissingSmtpConfigKeys();
        console.warn(`SMTP config is incomplete (${missingSmtpKeys.join(", ")}). Skipping member registration confirmation email.`);
        writeEmailLog({
            channel: "member-registration-confirmation",
            status: "skipped",
            to: params.toEmail,
            reason: "missing_smtp_config",
            details: { missingEnv: missingSmtpKeys },
        });
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    const subject = "Your Glitz registration is complete";

    writeEmailLog({
        channel: "member-registration-confirmation",
        status: "attempt",
        to: params.toEmail,
        subject,
    });

    try {
        const transporter = getSmtpTransport();

        await transporter.sendMail({
            from: getFromEmailAddress(),
            to: params.toEmail,
            subject,
            text: `Hi ${params.fullName},\n\nThank you for registering with Glitz of Diamonds. Your registration has been completed successfully and your member account is now active.\n\nIf you have any questions, please reply to this email.\n\n- Glitz of Diamonds`,
            html: `<p>Hi ${params.fullName},</p><p>Thank you for registering with <strong>Glitz of Diamonds</strong>. Your registration has been completed successfully and your member account is now active.</p><p>If you have any questions, please reply to this email.</p><p>- Glitz of Diamonds</p>`,
        });

        writeEmailLog({
            channel: "member-registration-confirmation",
            status: "success",
            to: params.toEmail,
            subject,
        });
        return { sent: true as const };
    } catch (error) {
        writeEmailLog({
            channel: "member-registration-confirmation",
            status: "error",
            to: params.toEmail,
            subject,
            reason: error instanceof Error ? error.message : "unknown_error",
        });
        throw error;
    }
}
