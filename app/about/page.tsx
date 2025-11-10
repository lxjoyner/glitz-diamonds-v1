// 📁 app/about/page.tsx
export default function AboutPage() {
    return (
        <main className="min-h-[calc(100vh-64px)] bg-black/40 border-t border-white/10">
            <div className="container mx-auto px-4 py-12 md:py-16">
                <h1 className="text-3xl md:text-4xl font-semibold mb-6">
                    Glitz Of Diamonds – Women Empowering Women

                    Established: January 1, 2023
                </h1>
                <p className="text-lg text-slate-200 max-w-3xl leading-relaxed">
                    <span className="font-bold">Mission & Purpose:&nbsp;</span><br />
                    Glitz Of Diamonds is a women’s organization dedicated to giving back to the community
                    through acts of kindness, service, and support. Our theme centers on volunteering and
                    donating supplies and equipment to women’s shelters, schools, and individuals facing
                    difficult times. We believe in the power of compassion, generosity, and sisterhood to make
                    a positive impact.
                </p>
                <p className="text-lg mt-4 text-slate-200 max-w-3xl leading-relaxed">
                    <span className="font-bold">Member Engagement:&nbsp;</span><br />
                    Within our circle, we celebrate life and connection—honoring birthdays, holidays, and
                    shared milestones. Members regularly gather for group dinners, social outings, and
                    brainstorming sessions where we exchange ideas, inspire one another, and strengthen our
                    bonds.
                </p>
                <p className="text-lg mt-4 text-slate-200 max-w-3xl leading-relaxed">
                    <span className="font-bold">Community & Fun:&nbsp;</span><br />
                    Beyond service, Glitz Of Diamonds embraces joy and togetherness. We host lively group
                    parties featuring music, karaoke, dancing, and laughter—creating a welcoming space
                    where every member feels valued, supported, and empowered.

                    In essence, Glitz Of Diamonds shines as a sisterhood devoted to service, celebration,
                    and solidarity—uplifting both our communities and one another.
                </p>
            </div>
        </main>
    );
}
