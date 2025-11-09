"use client";
import Image from "next/image";
import { useRef, useEffect } from "react";

//const SPARKLE_DURATION_MS = 10 * 1000; // 5 minutes

// Tune these to sit right on top of facets
const sparklePositions = [
    { top: "48%", left: "12%" },//Left sparkle
    { top: "10%", left: "37%" },//Next to left sparkle
    { top: "41%", left: "40%" },//Middle sparkle
    { top: "6%", left: "58%" },//Next to right sparkle
    { top: "53%", left: "76%" },//Next to right sparkle
    { top: "35%", left: "80%" },//Right sparkle
];

// Images for the horizontal gallery
// Replace these with your real image files in /public
const galleryImages = [
    "/20230728_School_Donation.jpg",
    "/20230730_Donation_Meet.jpg",
    "/Birthday_Celebration_2023.jpeg",
    "/Celebration.jpg",
    "/Christmas_Gathering.jpg",
    "/20230713_Women_Shelter.jpg",
];

export default function Hero() {
    //const [showSparkles, setShowSparkles] = useState(true);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const firstCardRef = useRef<HTMLDivElement | null>(null);
  //  useEffect(() => {
  //      const timer = setTimeout(() => setShowSparkles(false), SPARKLE_DURATION_MS);
  //      return () => clearTimeout(timer);
   // }, []);
    const handleScrollRight = () => {
        if (scrollRef.current && firstCardRef.current) {
            const cardWidth = firstCardRef.current.getBoundingClientRect().width;
            const gap = 16; // gap-4 ≈ 16px
            scrollRef.current.scrollBy({
                left: cardWidth + gap, // move by exactly 1 card
                behavior: "smooth",
            });
        }
    };

    const handleScrollLeft = () => {
        if (scrollRef.current && firstCardRef.current) {
            const cardWidth = firstCardRef.current.getBoundingClientRect().width;
            const gap = 16;
            scrollRef.current.scrollBy({
                left: -(cardWidth + gap),
                behavior: "smooth",
            });
        }
    };

    // Auto-scroll every few seconds
    useEffect(() => {
        const intervalMs = 3000; // 3 seconds

        const id = setInterval(() => {
            if (!scrollRef.current || !firstCardRef.current) return;

            const container = scrollRef.current;
            const cardWidth = firstCardRef.current.getBoundingClientRect().width;
            const gap = 16; // match gap-4

            const step = cardWidth + gap;
            const maxScrollLeft = container.scrollWidth - container.clientWidth;

            // If we're near the end, jump back to the start
            if (container.scrollLeft + step >= maxScrollLeft - 1) {
                container.scrollTo({ left: 0, behavior: "smooth" });
            } else {
                container.scrollBy({ left: step, behavior: "smooth" });
            }
        }, intervalMs);

        // Cleanup on unmount
        return () => clearInterval(id);
    }, []);

    return (
        <section
            id="home"
            className="relative min-h-[calc(100vh-64px)] flex items-center">

            {/* Background */}
            <div aria-hidden className="absolute inset-0">
                <Image
                    src="/diamonds_pic.png"
                    alt="Diamonds background"
                    fill
                    priority
                    className="object-cover object-center"
                />
                <div className="absolute inset-0 hero-overlay" />

                {/* Sparkles */}
                     <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {sparklePositions.map((pos, index) => (
                            <div
                                key={index}
                                className="sparkle-wrapper"
                                style={{
                                    top: pos.top,
                                    left: pos.left,
                                    animationDelay: `${index * 0.7}s`,
                                }}
                            >
                                <Image
                                    src="/sparkle2.png"
                                    alt="Diamond sparkle"
                                    fill
                                    className="sparkle-image"
                                />
                            </div>
                        ))}
                    </div>
            </div>

            {/* Centered bottom gallery */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 transform z-10 w-full max-w-[50rem]">
                <div className="flex items-center justify-between gap-3">
                    {/* Left arrow */}
                    <button
                        type="button"
                        onClick={handleScrollLeft}
                        className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-white/20 hover:bg-black/80 transition"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-5 w-5"
                        >
                            <path d="M15 6l-6 6 6 6" />
                        </svg>
                    </button>

                    {/* Viewport that shows about 4 cards */}
                    <div className="overflow-hidden flex-1">
                        <div
                            ref={scrollRef}
                            className="flex overflow-x-auto no-scrollbar gap-4 py-2 px-1 bg-black/40 rounded-xl border border-white/10"
                        >
                            {galleryImages.map((src, idx) => (
                                <div
                                    key={idx}
                                    ref={idx === 0 ? firstCardRef : null}
                                    className="relative h-24 w-40 md:h-32 md:w-40 flex-shrink-0 overflow-hidden rounded-lg border border-white/20 bg-black/50"
                                >
                                    <Image
                                        src={src}
                                        alt={`Gallery image ${idx + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right arrow */}
                    <button
                        type="button"
                        onClick={handleScrollRight}
                        className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-white/20 hover:bg-black/80 transition"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-5 w-5"
                        >
                            <path d="M9 6l6 6-6 6" />
                        </svg>
                    </button>
                </div>
            </div>

        </section>
    );
}
