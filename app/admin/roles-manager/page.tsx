"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    DEFAULT_ROLE_SETTINGS,
    ROLE_PERMISSION_OPTIONS,
    RolePermissionSection,
    RoleSettings,
} from "@/lib/role-settings-db";

type AuthUser = {
    id: string;
    username: string;
    role: string;
};

const sectionLabels: Record<RolePermissionSection, string> = {
    dashboardItems: "Dashboard Items",
    hamburgerMenuItems: "Hamburger Menu Items",
    ideasActivitiesItems: "Ideas & Activities Items",
};

const managedRoles: Array<keyof Omit<RoleSettings, "admin">> = ["secretary", "treasure", "member"];

export default function RolesManagerPage() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("");
    const [settings, setSettings] = useState<RoleSettings>(DEFAULT_ROLE_SETTINGS);

    const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

    useEffect(() => {
        async function load() {
            try {
                const meRes = await fetch("/api/admin/me", { cache: "no-store" });
                const meData = await meRes.json();

                if (!meData?.authenticated) {
                    router.replace("/admin/login");
                    return;
                }

                setUser(meData.user);

                if (meData.user?.role !== "admin") {
                    setLoading(false);
                    return;
                }

                const settingsRes = await fetch("/api/admin/role-settings", { cache: "no-store" });
                const settingsData = await settingsRes.json();

                if (!settingsRes.ok || !settingsData?.success) {
                    throw new Error(settingsData?.error || "Failed to load role settings.");
                }

                setSettings(settingsData.settings || DEFAULT_ROLE_SETTINGS);
            } catch (error) {
                setStatus(error instanceof Error ? error.message : "Failed to load role settings.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [router]);

    const updateAdminAccess = (value: boolean) => {
        setSettings((prev) => ({
            ...prev,
            admin: {
                accessViewAll: value,
            },
        }));
    };

    const updateRolePermission = (
        role: keyof Omit<RoleSettings, "admin">,
        section: RolePermissionSection,
        label: string,
        value: boolean
    ) => {
        setSettings((prev) => ({
            ...prev,
            [role]: {
                ...prev[role],
                [section]: {
                    ...prev[role][section],
                    [label]: value,
                },
            },
        }));
    };

    const saveSettings = async () => {
        setSaving(true);
        setStatus("");

        try {
            const res = await fetch("/api/admin/role-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });

            const data = await res.json();

            if (!res.ok || !data?.success) {
                throw new Error(data?.error || "Unable to save role settings.");
            }

            setSettings(data.settings || settings);
            setStatus("Role settings saved.");
        } catch (error) {
            setStatus(error instanceof Error ? error.message : "Unable to save role settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-black text-white px-4 py-12">
                <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-white/5 p-6">Loading...</div>
            </main>
        );
    }

    if (!isAdmin) {
        return (
            <main className="min-h-screen bg-black text-white px-4 py-12">
                <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
                    <h1 className="text-2xl font-semibold">Admin Access Required</h1>
                    <p className="mt-2 text-sm text-red-100">Only admin users can access the Roles Manager page.</p>
                    <Link href="/admin/messages" className="mt-4 inline-flex text-sm underline">
                        Return to dashboard
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white px-4 py-12">
            <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
                <h1 className="text-3xl font-semibold">Roles Manager</h1>
                <p className="mt-2 text-sm text-slate-300">
                    Configure role-based access with Yes/No checkboxes for each section.
                </p>

                <section className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
                    <h2 className="text-xl font-semibold">Admin Role</h2>
                    <p className="mt-1 text-sm text-slate-300">Access/View All</p>
                    <label className="mt-3 inline-flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={settings.admin.accessViewAll}
                            onChange={(event) => updateAdminAccess(event.target.checked)}
                        />
                        Yes
                    </label>
                </section>

                {managedRoles.map((role) => (
                    <section key={role} className="mt-6 rounded-xl border border-white/10 bg-black/30 p-4">
                        <h2 className="text-xl font-semibold capitalize">{role} Role</h2>
                        <p className="mt-1 text-sm text-slate-300">Have Access/View To:</p>

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            {Object.entries(ROLE_PERMISSION_OPTIONS).map(([sectionKey, labels]) => {
                                const typedSection = sectionKey as RolePermissionSection;
                                return (
                                    <div key={sectionKey} className="rounded-lg border border-white/10 p-3">
                                        <h3 className="text-sm font-semibold">{sectionLabels[typedSection]}</h3>
                                        <div className="mt-3 space-y-2">
                                            {labels.map((label) => (
                                                <label key={label} className="flex items-center justify-between gap-3 text-xs">
                                                    <span>{label}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(settings[role][typedSection][label])}
                                                        onChange={(event) =>
                                                            updateRolePermission(
                                                                role,
                                                                typedSection,
                                                                label,
                                                                event.target.checked
                                                            )
                                                        }
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}

                <div className="mt-8 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={saveSettings}
                        disabled={saving}
                        className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                        {saving ? "Saving..." : "Save Role Settings"}
                    </button>
                    {status && <p className="text-sm text-slate-200">{status}</p>}
                </div>
            </div>
        </main>
    );
}
