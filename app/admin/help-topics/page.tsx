"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ParentTopic = { id: string; title: string; category: string };
type CustomTopic = { id: string; parent_topic_id: string; title: string; category: string; summary: string };
const field = "mt-1 w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-white";

export default function HelpTopicManagerPage() {
    const [parents, setParents] = useState<ParentTopic[]>([]);
    const [topics, setTopics] = useState<CustomTopic[]>([]);
    const [parentTopicId, setParentTopicId] = useState("invoices");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("Invoicing");
    const [summary, setSummary] = useState("");
    const [editId, setEditId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function refresh() {
        const res = await fetch("/api/admin/help-topics", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load topics.");
        setParents(data.parentTopics || []);
        setTopics(data.topics || []);
    }
    useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load topics.")); }, []);

    function reset() {
        setEditId(null); setTitle(""); setCategory("Invoicing"); setSummary(""); setParentTopicId("invoices");
    }

    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setBusy(true); setError(""); setMessage("");
        try {
            const res = await fetch("/api/admin/help-topics", {
                method: editId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editId, parentTopicId, title, category, summary }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unable to save topic.");
            setMessage(editId ? "Help topic updated." : "Help topic added. You can now assign an MP4 in Manage Help Videos.");
            reset();
            await refresh();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save topic."); }
        finally { setBusy(false); }
    }

    async function remove(topic: CustomTopic) {
        if (!window.confirm("Delete this Help topic? Topics with videos cannot be deleted.")) return;
        setBusy(true); setError(""); setMessage("");
        try {
            const res = await fetch("/api/admin/help-topics?id=" + encodeURIComponent(topic.id), { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Unable to delete topic.");
            setMessage("Help topic deleted.");
            if (editId === topic.id) reset();
            await refresh();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to delete topic."); }
        finally { setBusy(false); }
    }

    return <main className="min-h-screen bg-black px-4 py-12 text-white">
        <section className="mx-auto max-w-4xl space-y-6">
            <div>
                <Link href="/admin/help-videos" className="text-red-300 underline">Back to Help Video Manager</Link>
                <h1 className="mt-3 text-3xl font-semibold">Manage Help Topics</h1>
                <p className="mt-2 text-sm text-slate-300">Create instructions for any existing feature. Choose the related feature to automatically inherit its role permissions and navigation link.</p>
            </div>
            <form onSubmit={save} className="space-y-4 rounded-xl border border-white/15 bg-white/5 p-5">
                <h2 className="text-xl font-semibold">{editId ? "Edit Help Topic" : "Add a Help Topic"}</h2>
                <label className="block text-sm">Related application feature (determines who can access this topic)
                    <select required value={parentTopicId} onChange={(event) => setParentTopicId(event.target.value)} className={field}>
                        {parents.map((item) => <option key={item.id} value={item.id}>{item.category} — {item.title}</option>)}
                    </select>
                </label>
                <label className="block text-sm">Help topic title
                    <input required maxLength={180} className={field} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="How to Record an Invoice Payment"/>
                </label>
                <label className="block text-sm">Category
                    <input required maxLength={100} className={field} value={category} onChange={(event) => setCategory(event.target.value)}/>
                </label>
                <label className="block text-sm">Description
                    <textarea maxLength={1000} className={field} rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Learn how to record a payment against an existing invoice."/>
                </label>
                <div className="flex flex-wrap gap-3">
                    <button disabled={busy} className="rounded-lg bg-red-800 px-5 py-2.5 font-semibold disabled:opacity-50" type="submit">{busy ? "Saving..." : editId ? "Save Changes" : "Create Help Topic"}</button>
                    {editId && <button type="button" className="rounded-lg border border-white/25 px-4 py-2" onClick={reset}>Cancel editing</button>}
                </div>
            </form>
            {message && <p role="status" className="text-emerald-300">{message}</p>}
            {error && <p role="alert" className="text-red-300">{error}</p>}
            <section className="space-y-3">
                <h2 className="text-xl font-semibold">Custom Help Topics ({topics.length})</h2>
                {topics.length === 0 && <p className="text-slate-400">No custom Help topics yet.</p>}
                {topics.map((topic) => <article key={topic.id} className="rounded-lg border border-white/15 bg-white/5 p-4">
                    <h3 className="font-semibold">{topic.title}</h3>
                    <p className="mt-1 text-xs text-slate-400">{topic.category} · Related feature: {parents.find((p) => p.id === topic.parent_topic_id)?.title || topic.parent_topic_id}</p>
                    {topic.summary && <p className="mt-2 text-sm text-slate-300">{topic.summary}</p>}
                    <div className="mt-3 flex gap-2">
                        <button disabled={busy} type="button" className="rounded-lg border border-white/25 px-3 py-2 text-sm" onClick={() => {
                            setEditId(topic.id); setParentTopicId(topic.parent_topic_id);
                            setTitle(topic.title); setCategory(topic.category); setSummary(topic.summary);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }}>Edit</button>
                        <button disabled={busy} type="button" className="rounded-lg border border-red-500/50 px-3 py-2 text-sm text-red-300" onClick={() => void remove(topic)}>Delete</button>
                    </div>
                </article>)}
            </section>
        </section>
    </main>;
}
