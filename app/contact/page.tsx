// 📁 app/contact/page.tsx
export default function ContactPage() {
    return (
        <main className="min-h-[calc(100vh-64px)] bg-black/60 border-t border-white/10">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <h1 className="text-3xl md:text-4xl font-semibold mb-6">
                    Contact
                </h1>

                <p className="text-lg text-slate-200 max-w-2xl mb-6">
                    Have a question about Glitz Of Diamonds, our events, or how to
                    get involved? Send us a message and we’ll get back to you.
                </p>

                <form className="max-w-xl space-y-4">
                    <div>
                        <label className="block text-md text-slate-200 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="Your full name"
                        />
                    </div>

                    <div>
                        <label className="block text-md text-slate-200 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-md text-slate-200 mb-1">
                            Message
                        </label>
                        <textarea
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                            placeholder="How can we help you?"
                        />
                    </div>

                    <button
                        type="submit"
                        className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-800 text-white text-sm font-medium hover:bg-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        Send Message
                    </button>
                </form>

                {/* By Phone section – AFTER the form, still inside the container */}
                <div className="mt-10 border-t border-white/10 pt-6">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                        By Phone
                    </h2>
                    <p className="text-lg text-slate-300 max-w-2xl">
                        Call the founder at <span className="font-semibold">817-689-8674</span>
                    </p>
                </div>

            </div>
        </main>
    );
}
