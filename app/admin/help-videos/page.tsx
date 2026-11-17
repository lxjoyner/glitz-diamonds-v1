"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Topic = { id: string; title: string; category: string };
type Video = { id: number; topic_id: string; title: string; description: string; size_bytes: number; is_active: number };
const fieldClass = "w-full rounded-lg border border-white/20 bg-black px-3 py-2 text-white";

export default function HelpVideoManagerPage() {
    const [topics, setTopics] = useState<Topic[]>([]);
    const [videos, setVideos] = useState<Video[]>([]);
    const [topicId, setTopicId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function refresh() {
        const [topicsRes, videosRes] = await Promise.all([
            fetch("/api/help/topics", { cache: "no-store" }),
            fetch("/api/admin/help-videos", { cache: "no-store" }),
        ]);
        const topicsData = await topicsRes.json();
        const videosData = await videosRes.json();
        if (!topicsRes.ok || !videosRes.ok) throw new Error(videosData.error || topicsData.error || "Unable to access video manager.");
        setTopics(topicsData.topics || []);
        setVideos(videosData.videos || []);
        setTopicId((old) => old || topicsData.topics?.[0]?.id || "");
    }

    useEffect(() => {
        void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load videos."));
    }, []);

    async function upload(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!file) return;
        setBusy(true); setError(""); setMessage("");
        try {
            const form = new FormData();
            form.append("topicId", topicId); form.append("title", title);
            form.append("description", description); form.append("file", file);
            const response = await fetch("/api/admin/help-videos", { method: "POST", body: form });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Upload failed.");
            setTitle(""); setDescription(""); setFile(null);
            const picker = document.getElementById("help-video-file") as HTMLInputElement | null;
            if (picker) picker.value = "";
            setMessage("Video uploaded and published for authorized users.");
            await refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Upload failed.");
        } finally { setBusy(false); }
    }

    async function updateVideo(video: Video, change: Partial<Video>) {
        setBusy(true); setError(""); setMessage("");
        try {
            const next = { ...video, ...change };
            const res = await fetch("/api/admin/help-videos", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: next.id, topicId: next.topic_id, title: next.title, description: next.description, active: Boolean(next.is_active) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed.");
            setMessage("Video updated."); await refresh();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Update failed."); }
        finally { setBusy(false); }
    }

    async function removeVideo(video: Video) {
        if (!window.confirm("Permanently delete this recording?")) return;
        setBusy(true); setError(""); setMessage("");
        try {
            const res = await fetch("/api/admin/help-videos?id=" + video.id, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed.");
            setMessage("Video deleted."); await refresh();
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Delete failed."); }
        finally { setBusy(false); }
    }

    return <main className="min-h-screen bg-black px-4 py-12 text-white">
        <div className="mx-auto max-w-4xl space-y-7">
            <div>
                <Link href="/help" className="text-red-300 underline">Back to Help Center</Link>
                <div className="mt-3"><Link href="/admin/help-topics" className="inline-flex rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white/10">Add / Manage Help Topics</Link></div>
                <h1 className="mt-3 text-3xl font-semibold">Help Video Manager</h1>
                <p className="mt-2 text-sm text-slate-300">Admin-only. Upload Snipping Tool MP4 recordings and assign each video to a Help topic. Visibility follows that topic's role permissions.</p>
            </div>
            <form onSubmit={upload} className="space-y-4 rounded-xl border border-white/15 bg-white/5 p-5">
                <h2 className="text-xl font-semibold">Add a tutorial</h2>
                <label className="block text-sm">Help topic
                    <select required value={topicId} onChange={(event) => setTopicId(event.target.value)} className={fieldClass + " mt-1"}>
                        {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.category} — {topic.title}</option>)}
                    </select>
                </label>
                <label className="block text-sm">Video title
                    <input required maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass + " mt-1"} placeholder="How to create a new invoice"/>
                </label>
                <label className="block text-sm">Description (optional)
                    <textarea maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className={fieldClass + " mt-1"} rows={3}/>
                </label>
                <label className="block text-sm">MP4 recording (maximum 30MB)
                    <input id="help-video-file" required type="file" accept=".mp4,video/mp4" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm"/>
                </label>
                <button type="submit" disabled={busy || !file || !topicId} className="rounded-lg bg-red-800 px-5 py-2.5 font-semibold disabled:opacity-50">{busy ? "Working..." : "Upload tutorial"}</button>
            </form>
            {message && <p role="status" className="text-emerald-300">{message}</p>}
            {error && <p role="alert" className="text-red-300">{error}</p>}
            <section className="space-y-3">
                <h2 className="text-xl font-semibold">Uploaded videos ({videos.length})</h2>
                {videos.length === 0 && <p className="text-slate-400">No recordings uploaded yet.</p>}
                {videos.map((video) => <article key={video.id} className="rounded-xl border border-white/15 bg-white/5 p-4">
                    <p className="font-semibold">{video.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{topics.find((topic) => topic.id === video.topic_id)?.title || video.topic_id} · {(video.size_bytes / 1024 / 1024).toFixed(1)} MB · {video.is_active ? "Published" : "Hidden"}</p>
                    {video.description && <p className="mt-2 text-sm text-slate-300">{video.description}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={() => void updateVideo(video, { is_active: video.is_active ? 0 : 1 })} className="rounded-md border border-white/25 px-3 py-2 text-sm disabled:opacity-50">{video.is_active ? "Hide" : "Publish"}</button>
                        <button type="button" disabled={busy} onClick={() => {
                            const nextTitle = window.prompt("Video title", video.title);
                            if (nextTitle === null) return;
                            const nextDescription = window.prompt("Description", video.description);
                            if (nextDescription === null) return;
                            void updateVideo(video, { title: nextTitle.trim(), description: nextDescription.trim() });
                        }} className="rounded-md border border-white/25 px-3 py-2 text-sm disabled:opacity-50">Edit details</button>
                        <button type="button" disabled={busy} onClick={() => void removeVideo(video)} className="rounded-md border border-red-500/50 px-3 py-2 text-sm text-red-300 disabled:opacity-50">Delete</button>
                    </div>
                </article>)}
            </section>
        </div>
    </main>;
}
