import nodemailer from "nodemailer";

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

function hasSmtpConfig(): boolean {
    return Boolean(
        process.env.SMTP_HOST &&
            process.env.SMTP_PORT &&
            process.env.SMTP_USER &&
            process.env.SMTP_PASS &&
            process.env.PASSWORD_RESET_FROM_EMAIL
    );
}

function getSmtpTransport() {
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
        console.warn(
            "SMTP config is incomplete. Skipping admin password-reset email dispatch."
        );
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    const transporter = getSmtpTransport();

    await transporter.sendMail({
        from: getRequiredEnv("PASSWORD_RESET_FROM_EMAIL"),
        to: params.toEmail,
        subject: "Reset your Glitz admin password",
        text: `Hi ${params.username},\n\nYour admin password has reached the 60-day rotation window. Reset it using this link:\n${params.resetUrl}\n\nIf you did not request this, contact your system administrator immediately.`,
        html: `<p>Hi ${params.username},</p><p>Your admin password has reached the 60-day rotation window.</p><p>Reset it using this link:</p><p><a href="${params.resetUrl}">${params.resetUrl}</a></p><p>If you did not request this, contact your system administrator immediately.</p>`,
    });

    return { sent: true as const };
}

export async function sendMemberRegistrationNotification(params: {
    toEmails: string[];
    fullName: string;
    username: string;
    email: string;
}) {
    if (!hasSmtpConfig()) {
        console.warn("SMTP config is incomplete. Skipping member registration email dispatch.");
        return { sent: false as const, reason: "missing_smtp_config" as const };
    }

    if (!params.toEmails.length) {
        return { sent: false as const, reason: "missing_admin_email" as const };
    }

    const transporter = getSmtpTransport();

    await transporter.sendMail({
        from: getRequiredEnv("PASSWORD_RESET_FROM_EMAIL"),
        to: params.toEmails.join(", "),
        subject: "New member registration submitted",
        text: `A new user registered as Member.\n\nName: ${params.fullName}\nUsername: ${params.username}\nEmail: ${params.email}`,
        html: `<p>A new user registered as <strong>Member</strong>.</p><ul><li><strong>Name:</strong> ${params.fullName}</li><li><strong>Username:</strong> ${params.username}</li><li><strong>Email:</strong> ${params.email}</li></ul>`,
    });

    return { sent: true as const };
}
