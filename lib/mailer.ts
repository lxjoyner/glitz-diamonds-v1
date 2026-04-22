import nodemailer from "nodemailer";
import { writeEmailLog } from "@/lib/email-log";

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

const REQUIRED_SMTP_ENV_KEYS = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "PASSWORD_RESET_FROM_EMAIL",
] as const;

export function getMissingSmtpConfigKeys(): string[] {
    return REQUIRED_SMTP_ENV_KEYS.filter((key) => {
        const value = process.env[key];
        return !value || !value.trim();
    });
}

export function hasSmtpConfig(): boolean {
    return getMissingSmtpConfigKeys().length === 0;
}

export function getSmtpTransport() {
    return nodemailer.createTransport({
        host: getRequiredEnv("SMTP_HOST"),
        port: Number(getRequiredEnv("SMTP_PORT")),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: {
            user: getRequiredEnv("SMTP_USER"),
            pass: getRequiredEnv("SMTP_PASS"),
        },
    });
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
            from: getRequiredEnv("PASSWORD_RESET_FROM_EMAIL"),
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

export async function sendMemberRegistrationNotification(params: {
    toEmails: string[];
    fullName: string;
    username: string;
    email: string;
    address: string;
    tshirtSize: string;
    favoriteColor: string;
    hatSize: string;
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
            from: getRequiredEnv("PASSWORD_RESET_FROM_EMAIL"),
            to,
            subject,
            text: `A new user registered as Member.\n\nName: ${params.fullName}\nUsername: ${params.username}\nEmail: ${params.email}\nAddress: ${params.address}\nT-Shirt Size: ${params.tshirtSize}\nFavorite Color: ${params.favoriteColor}\nHat Size: ${params.hatSize}\nGender: ${params.gender}\nBirthday (MMDDYYYY): ${params.birthday}`,
            html: `<p>A new user registered as <strong>Member</strong>.</p><ul><li><strong>Name:</strong> ${params.fullName}</li><li><strong>Username:</strong> ${params.username}</li><li><strong>Email:</strong> ${params.email}</li><li><strong>Address:</strong> ${params.address}</li><li><strong>T-Shirt Size:</strong> ${params.tshirtSize}</li><li><strong>Favorite Color:</strong> ${params.favoriteColor}</li><li><strong>Hat Size:</strong> ${params.hatSize}</li><li><strong>Gender:</strong> ${params.gender}</li><li><strong>Birthday (MMDDYYYY):</strong> ${params.birthday}</li></ul>`,
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
            from: getRequiredEnv("PASSWORD_RESET_FROM_EMAIL"),
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
