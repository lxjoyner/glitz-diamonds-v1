import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createRegisteredUser, getUserByEmail, getUserByUsername } from "@/lib/user-db";
import { getAdminNotificationEmails } from "@/lib/admin-db";
import { sendMemberRegistrationConfirmation, sendMemberRegistrationNotification } from "@/lib/mailer";
import { verifyMemberInviteToken } from "@/lib/auth";
import { consumeMemberInviteToken, isMemberInviteTokenConsumed } from "@/lib/member-invite-db";

const T_SHIRT_SIZES = new Set(["XS", "SM", "M", "LG", "XL", "XXL", "XXXL", "XXXXL"]);
const JACKET_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL", "XXXL", "XXXXL"]);
const GENDERS = new Set(["Male", "Female"]);

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidBirthdayMmDd(value: string): boolean {
    if (!/^\d{4}$/.test(value)) return false;

    const month = Number(value.slice(0, 2));
    const day = Number(value.slice(2, 4));

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if ([4, 6, 9, 11].includes(month) && day > 30) return false;
    if (month === 2 && day > 29) return false;
    return true;
}

function isValidPassword(password: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%&*]).{12,}$/.test(password);
}

export async function POST(req: Request) {
    try {
        const {
            fullName,
            firstName,
            middleInitial,
            lastName,
            username,
            email,
            password,
            address,
            streetAddress,
            city,
            state,
            zipCode,
            tshirtSize,
            favoriteColor,
            jacketSize,
            gender,
            birthday,
            inviteToken,
        } = await req.json();

        const cleanFirstName = String(firstName || "").trim();
        const cleanMiddleInitial = String(middleInitial || "").trim();
        const cleanLastName = String(lastName || "").trim();
        const cleanFullName = String(fullName || "")
            .trim() || [cleanFirstName, cleanMiddleInitial, cleanLastName].filter(Boolean).join(" ");
        const cleanUsername = String(username || "").trim().toLowerCase();
        const cleanEmail = String(email || "").trim().toLowerCase();
        const cleanPassword = String(password || "");
        const cleanStreetAddress = String(streetAddress || "").trim();
        const cleanCity = String(city || "").trim();
        const cleanState = String(state || "").trim().toUpperCase();
        const cleanZipCode = String(zipCode || "").trim();
        const cleanAddress = String(address || "")
            .trim() || [cleanStreetAddress, cleanCity, cleanState, cleanZipCode].filter(Boolean).join(", ");
        const cleanTshirtSize = String(tshirtSize || "").trim().toUpperCase();
        const cleanFavoriteColor = String(favoriteColor || "").trim();
        const cleanJacketSize = String(jacketSize || "").trim().toUpperCase();
        const cleanGender = String(gender || "").trim();
        const cleanBirthday = String(birthday || "").trim();
        const cleanInviteToken = String(inviteToken || "").trim();

        if (!cleanInviteToken) {
            return NextResponse.json(
                { success: false, error: "A valid member invite link is required." },
                { status: 403 }
            );
        }

        let invitePayload;

        try {
            invitePayload = verifyMemberInviteToken(cleanInviteToken);
        } catch {
            return NextResponse.json(
                { success: false, error: "Invite link is invalid or expired." },
                { status: 403 }
            );
        }

        if (
            !cleanFullName ||
            !cleanUsername ||
            !cleanEmail ||
            !cleanPassword ||
            !cleanAddress ||
            !cleanTshirtSize ||
            !cleanFavoriteColor ||
            !cleanJacketSize ||
            !cleanGender ||
            !cleanBirthday
        ) {
            return NextResponse.json(
                { success: false, error: "All registration fields are required." },
                { status: 400 }
            );
        }

        if (cleanFirstName.toLowerCase() !== invitePayload.firstName.trim().toLowerCase()) {
            return NextResponse.json(
                { success: false, error: "First name must match the invited member." },
                { status: 400 }
            );
        }

        if (cleanLastName.toLowerCase() !== invitePayload.lastName.trim().toLowerCase()) {
            return NextResponse.json(
                { success: false, error: "Last name must match the invited member." },
                { status: 400 }
            );
        }

        if (cleanEmail !== invitePayload.email.trim().toLowerCase()) {
            return NextResponse.json(
                { success: false, error: "Email address must match the invite link." },
                { status: 400 }
            );
        }

        const isConsumed = await isMemberInviteTokenConsumed(cleanInviteToken);
        if (isConsumed) {
            return NextResponse.json(
                { success: false, error: "This invite link has already been used." },
                { status: 410 }
            );
        }

        if (!isValidPassword(cleanPassword)) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Password must be at least 12 characters and include uppercase, lowercase, number, and one symbol: !@#$%&*.",
                },
                { status: 400 }
            );
        }

        if (!isValidEmail(cleanEmail)) {
            return NextResponse.json(
                { success: false, error: "Please provide a valid email address." },
                { status: 400 }
            );
        }

        if (!T_SHIRT_SIZES.has(cleanTshirtSize)) {
            return NextResponse.json(
                { success: false, error: "Please select a valid T-shirt size." },
                { status: 400 }
            );
        }

        if (!JACKET_SIZES.has(cleanJacketSize)) {
            return NextResponse.json(
                { success: false, error: "Please select a valid jacket size." },
                { status: 400 }
            );
        }

        if (!GENDERS.has(cleanGender)) {
            return NextResponse.json(
                { success: false, error: "Please select Male or Female." },
                { status: 400 }
            );
        }

        if (!/^\d{5}$/.test(cleanZipCode)) {
            return NextResponse.json(
                { success: false, error: "Zip code must be exactly 5 numbers." },
                { status: 400 }
            );
        }

        if (!isValidBirthdayMmDd(cleanBirthday)) {
            return NextResponse.json(
                { success: false, error: "Birthday must be in MMDD format and a valid date." },
                { status: 400 }
            );
        }

        const existingUserByUsername = await getUserByUsername(cleanUsername);
        if (existingUserByUsername) {
            return NextResponse.json(
                { success: false, error: "Username is already in use." },
                { status: 409 }
            );
        }

        const existingUserByEmail = await getUserByEmail(cleanEmail);
        if (existingUserByEmail) {
            return NextResponse.json(
                { success: false, error: "Email is already in use." },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(cleanPassword, 12);

        const inviteConsumed = await consumeMemberInviteToken(cleanInviteToken, cleanEmail);
        if (!inviteConsumed) {
            return NextResponse.json(
                { success: false, error: "This invite link has already been used." },
                { status: 410 }
            );
        }

        await createRegisteredUser({
            fullName: cleanFullName,
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
            address: cleanAddress,
            tshirtSize: cleanTshirtSize,
            favoriteColor: cleanFavoriteColor,
            hatSize: cleanJacketSize,
            gender: cleanGender,
            birthday: cleanBirthday,
        });

        const adminEmails = await getAdminNotificationEmails();
        await sendMemberRegistrationNotification({
            toEmails: adminEmails,
            fullName: cleanFullName,
            username: cleanUsername,
            email: cleanEmail,
            address: cleanAddress,
            tshirtSize: cleanTshirtSize,
            favoriteColor: cleanFavoriteColor,
            jacketSize: cleanJacketSize,
            gender: cleanGender,
            birthday: cleanBirthday,
        });
        await sendMemberRegistrationConfirmation({
            toEmail: cleanEmail,
            fullName: cleanFullName,
        });

        return NextResponse.json({
            success: true,
            message: "Registration successful. Your account was created as a Member.",
        });
    } catch (error) {
        console.error("Registration error please contact owner:", error);

        return NextResponse.json(
            { success: false, error: "Failed to register at this time." },
            { status: 500 }
        );
    }
}
