import pool from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export type VendorType = "regular" | "1099-nec";

export type VendorInput = {
    vendorName: string;
    vendorType: VendorType;
    firstName?: string;
    lastName?: string;
    currency?: string;
    email?: string;
    country?: string;
    provinceState?: string;
    address1?: string;
    address2?: string;
    city?: string;
    postalCode?: string;
    additionalInfo?: string;
};

export type VendorRow = RowDataPacket & {
    id: number;
    vendor_name: string;
    vendor_type: VendorType;
    first_name: string | null;
    last_name: string | null;
    currency: string;
    email: string | null;
    country: string | null;
    province_state: string | null;
    address1: string | null;
    address2: string | null;
    city: string | null;
    postal_code: string | null;
    additional_info: string | null;
    created_at: string;
    updated_at: string;
};

export async function ensureVendorSchema() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vendors (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            vendor_name VARCHAR(180) NOT NULL,
            vendor_type ENUM('regular','1099-nec') NOT NULL DEFAULT 'regular',
            first_name VARCHAR(120) NULL,
            last_name VARCHAR(120) NULL,
            currency VARCHAR(20) NOT NULL DEFAULT 'USD',
            email VARCHAR(180) NULL,
            country VARCHAR(120) NULL,
            province_state VARCHAR(120) NULL,
            address1 VARCHAR(255) NULL,
            address2 VARCHAR(255) NULL,
            city VARCHAR(120) NULL,
            postal_code VARCHAR(40) NULL,
            additional_info TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_vendors_name (vendor_name)
        )
    `);
}

export async function listVendors(): Promise<VendorRow[]> {
    await ensureVendorSchema();
    const [rows] = await pool.query<VendorRow[]>(`
        SELECT *
        FROM vendors
        ORDER BY vendor_name, id
    `);
    return rows;
}

export async function getVendorById(id: number): Promise<VendorRow | null> {
    await ensureVendorSchema();
    const [rows] = await pool.query<VendorRow[]>(`
        SELECT *
        FROM vendors
        WHERE id = ?
        LIMIT 1
    `, [id]);
    return rows[0] || null;
}

export async function createVendor(input: VendorInput) {
    await ensureVendorSchema();
    const name = input.vendorName.trim();
    if (!name) throw new Error("INVALID_NAME");

    const [result] = await pool.execute<ResultSetHeader>(`
        INSERT INTO vendors (
            vendor_name, vendor_type, first_name, last_name, currency, email,
            country, province_state, address1, address2, city, postal_code, additional_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        name,
        input.vendorType || "regular",
        input.firstName?.trim() || null,
        input.lastName?.trim() || null,
        input.currency || "USD",
        input.email?.trim() || null,
        input.country?.trim() || null,
        input.provinceState?.trim() || null,
        input.address1?.trim() || null,
        input.address2?.trim() || null,
        input.city?.trim() || null,
        input.postalCode?.trim() || null,
        input.additionalInfo?.trim() || null,
    ]);

    return getVendorById(result.insertId);
}

export async function updateVendor(id: number, input: VendorInput) {
    await ensureVendorSchema();
    const name = input.vendorName.trim();
    if (!name) throw new Error("INVALID_NAME");

    await pool.execute(`
        UPDATE vendors
        SET vendor_name = ?, vendor_type = ?, first_name = ?, last_name = ?, currency = ?, email = ?,
            country = ?, province_state = ?, address1 = ?, address2 = ?, city = ?, postal_code = ?, additional_info = ?
        WHERE id = ?
    `, [
        name,
        input.vendorType || "regular",
        input.firstName?.trim() || null,
        input.lastName?.trim() || null,
        input.currency || "USD",
        input.email?.trim() || null,
        input.country?.trim() || null,
        input.provinceState?.trim() || null,
        input.address1?.trim() || null,
        input.address2?.trim() || null,
        input.city?.trim() || null,
        input.postalCode?.trim() || null,
        input.additionalInfo?.trim() || null,
        id,
    ]);

    return getVendorById(id);
}

export async function deleteVendor(id: number) {
    await ensureVendorSchema();
    const [result] = await pool.execute<ResultSetHeader>(`DELETE FROM vendors WHERE id = ?`, [id]);
    return result.affectedRows === 1;
}
