import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createRegisteredUser, getUserByEmail, getUserByUsername } from "@/lib/user-db";
import { getAdminNotificationEmails } from "@/lib/admin-db";
import { sendMemberRegistrationConfirmation, sendMemberRegistrationNotification } from "@/lib/mailer";

const T_SHIRT_SIZES = new Set(["XS", "SM", "M", "LG", "XL", "XXL", "XXXL", "XXXXL"]);
const HAT_SIZES = new Set(["S", "M", "L", "XL"]);
const GENDERS = new Set(["Male", "Female"]);

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidBirthdayMmDdYyyy(value: string): boolean {
    if (!/^\d{8}$/.test(value)) return false;

    const month = Number(value.slice(0, 2));
    const day = Number(value.slice(2, 4));
    const year = Number(value.slice(4, 8));

    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;

    const maxDaysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= maxDaysInMonth;
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
            hatSize,
            gender,
            birthday,
        } = await req.json();

        const cleanFirstName = String(firstName || "").trim();
        const cleanMiddleInitial = String(middleInitial || "").trim().slice(0, 1).toUpperCase();
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
        const cleanHatSize = String(hatSize || "").trim().toUpperCase();
        const cleanGender = String(gender || "").trim();
        const cleanBirthday = String(birthday || "").trim();

        if (
            !cleanFullName ||
            !cleanUsername ||
            !cleanEmail ||
            !cleanPassword ||
            !cleanAddress ||
            !cleanTshirtSize ||
            !cleanFavoriteColor ||
            !cleanHatSize ||
            !cleanGender ||
            !cleanBirthday
        ) {
            return NextResponse.json(
                { success: false, error: "All registration fields are required." },
                { status: 400 }
            );
        }

        if (cleanPassword.length < 12) {
            return NextResponse.json(
                { success: false, error: "Password must be at least 12 characters." },
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

        if (!HAT_SIZES.has(cleanHatSize)) {
            return NextResponse.json(
                { success: false, error: "Please select a valid hat size." },
                { status: 400 }
            );
        }

        if (!GENDERS.has(cleanGender)) {
            return NextResponse.json(
                { success: false, error: "Please select Male or Female." },
                { status: 400 }
            );
        }

        if (!isValidBirthdayMmDdYyyy(cleanBirthday)) {
            return NextResponse.json(
                { success: false, error: "Birthday must be in MMDDYYYY format and a valid date." },
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

        await createRegisteredUser({
            fullName: cleanFullName,
            username: cleanUsername,
            email: cleanEmail,
            passwordHash,
            address: cleanAddress,
            tshirtSize: cleanTshirtSize,
            favoriteColor: cleanFavoriteColor,
            hatSize: cleanHatSize,
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
            hatSize: cleanHatSize,
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
        console.error("Registration error:", error);

        return NextResponse.json(
            { success: false, error: "Failed to register at this time." },
            { status: 500 }
        );
    }
}
