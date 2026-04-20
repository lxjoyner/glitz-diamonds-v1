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

    const transporter = nodemailer.createTransport({
        host: getRequiredEnv("SMTP_HOST"),
        port: Number(getRequiredEnv("SMTP_PORT")),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: {
            user: getRequiredEnv("SMTP_USER"),
            pass: getRequiredEnv("SMTP_PASS"),
        },
    });

    await transporter.sendMail({
        from: getRequiredEnv("PASSWORD_RESET_FROM_EMAIL"),
        to: params.toEmail,
        subject: "Reset your Glitz admin password",
        text: `Hi ${params.username},\n\nYour admin password has reached the 60-day rotation window. Reset it using this link:\n${params.resetUrl}\n\nIf you did not request this, contact your system administrator immediately.`,
        html: `<p>Hi ${params.username},</p><p>Your admin password has reached the 60-day rotation window.</p><p>Reset it using this link:</p><p><a href="${params.resetUrl}">${params.resetUrl}</a></p><p>If you did not request this, contact your system administrator immediately.</p>`,
    });

    return { sent: true as const };
}
