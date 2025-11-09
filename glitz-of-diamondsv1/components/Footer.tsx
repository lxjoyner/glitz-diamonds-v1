export default function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black/40">
            <div className="container py-8 grid md:grid-cols-3 gap-8 text-sm text-slate-300">
                <div>
                    <p className="mt-0 text-slate-400">© {new Date().getFullYear()} Glitz Of Diamonds. All rights reserved.</p>
                </div>
                <div className="md:justify-self-center">
                    <nav className="space-x-4">
                        <a href="#home" className="hover:underline">Home</a>
                        <a href="#about" className="hover:underline">About Us</a>
                        <a href="#contact" className="hover:underline">Contact</a>
                    </nav>
                </div>
                <div className="md:justify-self-end">
                    <p>Created by Lavasier Joyner</p>
                </div>
            </div>
        </footer>
    );
}