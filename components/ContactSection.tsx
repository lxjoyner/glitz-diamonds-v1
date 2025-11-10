// 📁 components/ContactSection.tsx
export default function ContactSection() {
    return (
        <section
            id="contact"
            className="scroll-mt-24 bg-black/60 border-t border-white/10"
        >
            <div className="container mx-auto px-4 py-12 md:py-16">
                <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                    Contact
                </h2>

                <p className="text-slate-300 max-w-2xl mb-6">
                    Have a question about a piece, an order, or a custom design?
                    We’d love to hear from you.
                </p>

                <form className="max-w-xl space-y-4">
                    <div>
                        <label className="block text-sm text-slate-300 mb-1">
                            Name
                        </label>
                        <input
                            type="text"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/60"
                            placeholder="Your name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-slate-300 mb-1">
                            Message
                        </label>
                        <textarea
                            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/60"
                            placeholder="How can we help you?"
                        />
                    </div>

                    <button
                        type="submit"
                        className="inline-flex items-center px-5 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-400 transition focus:outline-none focus:ring-2 focus:ring-red-500/60"
                    >
                        Send Message
                    </button>
                </form>

                <div className="text-sm text-gray-600">
                    <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                        By Phone
                    </h2>
                    <p className="text-slate-300 max-w-2xl mb-6">
                        Call the founder at 817-689-8674

                    </p>
                </div>
            </div>
        </section>
    );
}
