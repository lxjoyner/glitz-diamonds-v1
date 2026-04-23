import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/auth";
import {
    deleteContactMessageById,
    getAllContactMessages,
    getContactMessageById,
} from "@/lib/contact-db";
import { deleteContactMessageEmail } from "@/lib/contact-email-mailbox";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const payload = verifyAdminToken(token);

        if (payload.role !== "admin" && payload.role !== "secretary") {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        const messages = await getAllContactMessages();

        return NextResponse.json({
            success: true,
            messages,
        });
    } catch (error) {
        console.error("Admin messages API error:", error);

        return NextResponse.json(
            { success: false, error: "Unauthorized", messages: [] },
            { status: 401 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const token = req.cookies.get("glitz_token")?.value;

    if (!token) {
        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const payload = verifyAdminToken(token);

        if (payload.role !== "admin" && payload.role !== "secretary") {
            return NextResponse.json(
                { success: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        const body = await req.json().catch(() => null);
        const messageId = Number(body?.id);

        if (!Number.isInteger(messageId) || messageId <= 0) {
            return NextResponse.json(
                { success: false, error: "A valid message id is required." },
                { status: 400 }
            );
        }

        const message = await getContactMessageById(messageId);

        if (!message) {
            return NextResponse.json(
                { success: false, error: "Message not found." },
                { status: 404 }
            );
        }

        const deleted = await deleteContactMessageById(messageId);

        if (!deleted) {
            return NextResponse.json(
                { success: false, error: "Message not found." },
                { status: 404 }
            );
        }

        let emailDeletionAttempted = false;
        let deletedEmailCount = 0;

        try {
            const result = await deleteContactMessageEmail(message);
            emailDeletionAttempted = result.attempted;
            deletedEmailCount = result.deletedCount;
        } catch (error) {
            console.error("Failed to delete contact email from mailbox:", error);
        }

        return NextResponse.json({
            success: true,
            emailDeletionAttempted,
            deletedEmailCount,
        });
    } catch (error) {
        console.error("Admin messages delete API error:", error);

        return NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 }
        );
    }
}
