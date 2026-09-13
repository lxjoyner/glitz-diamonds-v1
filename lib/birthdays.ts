export type BirthdayMonthDay = {
    month: number;
    day: number;
};

/**
 * Registration stores birthdays as four digits in MMDD order. Keep parsing
 * deliberately strict so malformed legacy values are ignored rather than
 * producing an invalid calendar date.
 */
export function parseBirthday(value: string | null | undefined): BirthdayMonthDay | null {
    const normalized = String(value ?? "").trim();
    if (!/^\d{4}$/.test(normalized)) return null;

    const month = Number(normalized.slice(0, 2));
    const day = Number(normalized.slice(2, 4));
    const validationYear = month === 2 && day === 29 ? 2024 : 2023;
    const candidate = new Date(validationYear, month - 1, day);

    if (candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
    return { month, day };
}

export function birthdayDateForYear(birthday: BirthdayMonthDay, year: number): Date {
    // Celebrate February 29 birthdays on February 28 when the displayed year is not a leap year.
    if (birthday.month === 2 && birthday.day === 29) {
        const isLeapYear = new Date(year, 1, 29).getDate() === 29;
        return new Date(year, 1, isLeapYear ? 29 : 28);
    }

    return new Date(year, birthday.month - 1, birthday.day);
}

export function formatBirthdayMonthDay(value: string): string | null {
    const birthday = parseBirthday(value);
    if (!birthday) return null;

    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
        new Date(Date.UTC(2024, birthday.month - 1, birthday.day))
    );
}
