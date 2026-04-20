import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";

export type AdminJwtPayload = JwtPayload & {
    sub: string;
    username: string;
    role: string;
};

function getJwtSecret(): Secret {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("Missing JWT_SECRET");
    }

    return secret;
}

function getJwtExpiresIn(): SignOptions["expiresIn"] {
    return (process.env.JWT_EXPIRES_IN || "8h") as SignOptions["expiresIn"];
}

export function signAdminToken(payload: {
    sub: string;
    username: string;
    role: string;
}): string {
    return jwt.sign(payload, getJwtSecret(), {
        expiresIn: getJwtExpiresIn(),
    });
}

export function verifyAdminToken(token: string): AdminJwtPayload {
    const decoded = jwt.verify(token, getJwtSecret());

    if (typeof decoded === "string") {
        throw new Error("Invalid token payload");
    }

    if (
        typeof decoded.sub !== "string" ||
        typeof decoded.username !== "string" ||
        typeof decoded.role !== "string"
    ) {
        throw new Error("Invalid token structure");
    }

    return decoded as AdminJwtPayload;
}