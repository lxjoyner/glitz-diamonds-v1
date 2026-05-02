"use client";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";

const sparklePositions = [
    {
        top: "48%",
        left: "12%",
        tabletTop: "55%",
        tabletLeft: "10%",
        phoneTop: "65%",
        phoneLeft: "8%",
    },
    {
        top: "41%",
        left: "40%",
        tabletTop: "60%",
        tabletLeft: "45%",
        phoneTop: "58%",
        phoneLeft: "46%",
    },
    {
        top: "38%",
        left: "80%",
        tabletTop: "62%",
        tabletLeft: "82%",
        phoneTop: "45%",
        phoneLeft: "81%",
    },
];

const fallbackGalleryImages = [
    {
        src: "/20230728_School_Donation.jpg",
        caption: "School Donation Event",
    },
    {
        src: "/20230730_Donation_Meet.jpg",
        caption: "Community Donation Meetup",
    },
    {
        src: "/Birthday_Celebration_2023.jpeg",
        caption: "Birthday Celebration 2023",
    },
    {
        src: "/Celebration.jpg",
        caption: "Glitz Of Diamonds Celebration",
    },
    {
        src: "/Christmas_Gathering.jpg",
        caption: "Christmas Gathering",
    },
    {
        src: "/20230713_Women_Shelter.jpg",
        caption: "Women’s Shelter Support Event",
    },
];

export default function Hero() {
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const firstCardRef = useRef<HTMLButtonElement | null>(null);
    const thumbStripRef = useRef<HTMLDivElement | null>(null);

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [galleryImages, setGalleryImages] = useState(fallbackGalleryImages);

    const handleScrollRight = () => {
        if (scrollRef.current && firstCardRef.current) {
            const cardWidth = firstCardRef.current.getBoundingClientRect().width;
            const gap = 16;
            scrollRef.current.scrollBy({
                left: cardWidth + gap,
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

    const openLightbox = (index: number) => {
        setSelectedIndex(index);
        requestAnimationFrame(() => setIsOpen(true));
    };

    const closeLightbox = () => {
        setIsOpen(false);
        setTimeout(() => setSelectedIndex(null), 220);
    };

    const showPrevImage = () => {
        if (selectedIndex === null) return;
        setSelectedIndex((selectedIndex - 1 + galleryImages.length) % galleryImages.length);
    };

    const showNextImage = () => {
        if (selectedIndex === null) return;
        setSelectedIndex((selectedIndex + 1) % galleryImages.length);
    };


    useEffect(() => {
        async function loadGalleryImages() {
            try {
                const res = await fetch("/api/gallery", { cache: "no-store" });
                const data = (await res.json()) as {
                    success?: boolean;
                    images?: Array<{ id: number; caption: string; imageUrl: string }>;
                };

                if (!data.success || !Array.isArray(data.images) || data.images.length === 0) {
                    setGalleryImages(fallbackGalleryImages);
                    return;
                }

                setGalleryImages(
                    data.images.map((item) => ({
                        src: item.imageUrl,
                        caption: item.caption,
                    }))
                );
            } catch (error) {
                console.error("Failed to load gallery images:", error);
                setGalleryImages(fallbackGalleryImages);
            }
        }

        loadGalleryImages();
    }, []);

    useEffect(() => {
        const intervalMs = 3000;

        const id = setInterval(() => {
            if (!scrollRef.current || !firstCardRef.current || selectedIndex !== null) return;

            const container = scrollRef.current;
            const cardWidth = firstCardRef.current.getBoundingClientRect().width;
            const gap = 16;
            const step = cardWidth + gap;
            const maxScrollLeft = container.scrollWidth - container.clientWidth;

            if (container.scrollLeft + step >= maxScrollLeft - 1) {
                container.scrollTo({ left: 0, behavior: "smooth" });
            } else {
                container.scrollBy({ left: step, behavior: "smooth" });
            }
        }, intervalMs);

        return () => clearInterval(id);
    }, [selectedIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedIndex === null) return;

            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") showPrevImage();
            if (e.key === "ArrowRight") showNextImage();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedIndex]);

    useEffect(() => {
        if (selectedIndex === null || !thumbStripRef.current) return;

        const activeThumb = thumbStripRef.current.querySelector(
            `[data-thumb-index="${selectedIndex}"]`
        ) as HTMLButtonElement | null;

        activeThumb?.scrollIntoView({
            behavior: "smooth",
            inline: "center",
            block: "nearest",
        });
    }, [selectedIndex]);


    const selectedImage =
        selectedIndex !== null ? galleryImages[selectedIndex] : null;

    return (
        <>
            <section
                id="home"
                className="relative h-[calc(100dvh-64px)] min-h-[520px] max-h-[900px] overflow-hidden flex items-end md:items-center"
            >
                {/* Background */}
                <div aria-hidden className="absolute inset-0">
                    <Image
                        src="/diamonds_pic.png"
                        alt="Diamonds background"
                        fill
                        priority
                        quality={100}
                        className="hero-bg-img contrast-125 brightness-110 saturate-110"
                    />
                    <div className="absolute inset-0 hero-overlay" />

                    {/* Sparkles */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {sparklePositions.map((pos, index) => (
                            <div
                                key={index}
                                className="sparkle-wrapper"
                                style={
                                    {
                                        "--sparkle-top": pos.top,
                                        "--sparkle-left": pos.left,
                                        "--sparkle-tablet-top": pos.tabletTop,
                                        "--sparkle-tablet-left": pos.tabletLeft,
                                        "--sparkle-phone-top": pos.phoneTop,
                                        "--sparkle-phone-left": pos.phoneLeft,
                                        animationDelay: `${index * 0.7}s`,
                                    } as React.CSSProperties
                                }
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
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 transform z-10 w-full max-w-[54rem] px-4">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onClick={handleScrollLeft}
                            className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-white/20 hover:bg-black/80 transition"
                            aria-label="Scroll gallery left"
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

                        <div className="overflow-hidden flex-1">
                            <div
                                ref={scrollRef}
                                className="flex overflow-x-auto no-scrollbar gap-4 py-2 px-1 bg-black/40 rounded-xl border border-white/10"
                            >
                                {galleryImages.map((item, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        ref={idx === 0 ? firstCardRef : null}
                                        onClick={() => openLightbox(idx)}
                                        className="relative h-[90px] w-[150px] md:h-[120px] md:w-[165px] flex-none overflow-hidden rounded-lg border border-white/20 bg-black/50 cursor-pointer group"
                                        aria-label={`Open ${item.caption}`}
                                    >
                                        <Image
                                            src={item.src}
                                            alt={item.caption}
                                            fill
                                            unoptimized={item.src.startsWith("/api/gallery/")}
                                            className="object-cover transition duration-300 group-hover:scale-105"
                                        />

                                        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1">
                                            <p className="text-[10px] md:text-xs text-white/90 truncate text-center">
                                                {item.caption}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleScrollRight}
                            className="hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/60 border border-white/20 hover:bg-black/80 transition"
                            aria-label="Scroll gallery right"
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

            {/* Premium Lightbox */}
            {selectedImage && (
                <div
                    className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                        isOpen ? "bg-black/90 opacity-100" : "bg-black/0 opacity-0"
                    }`}
                    onClick={closeLightbox}
                >
                    <div
                        className={`relative w-full max-w-6xl transition-all duration-200 ${
                            isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
                        }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={closeLightbox}
                            className="absolute -top-4 right-0 z-20 h-11 w-11 rounded-full bg-white text-black text-xl font-bold shadow-lg hover:scale-105 transition"
                            aria-label="Close image popup"
                        >
                            ✕
                        </button>

                        <button
                            type="button"
                            onClick={showPrevImage}
                            className="absolute left-2 top-[35%] z-20 -translate-y-1/2 h-12 w-12 rounded-full bg-black/65 border border-white/20 text-white hover:bg-black/85 transition flex items-center justify-center"
                            aria-label="Previous image"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-6 w-6"
                            >
                                <path d="M15 6l-6 6 6 6" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={showNextImage}
                            className="absolute right-2 top-[35%] z-20 -translate-y-1/2 h-12 w-12 rounded-full bg-black/65 border border-white/20 text-white hover:bg-black/85 transition flex items-center justify-center"
                            aria-label="Next image"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-6 w-6"
                            >
                                <path d="M9 6l6 6-6 6" />
                            </svg>
                        </button>

                        <div className="overflow-hidden rounded-2xl border border-white/15 bg-black shadow-2xl">
                            <div className="relative h-[62vh] w-full">
                                <Image
                                    src={selectedImage.src}
                                    alt={selectedImage.caption}
                                    fill
                                    unoptimized={selectedImage.src.startsWith("/api/gallery/")}
                                    className="object-contain bg-black"
                                    quality={100}
                                />
                            </div>

                            <div className="border-t border-white/10 bg-black/80 px-6 py-4 text-center">
                                <p className="text-base md:text-lg font-medium text-white">
                                    {selectedImage.caption}
                                </p>
                                <p className="mt-1 text-sm text-white/65">
                                    {selectedIndex! + 1} of {galleryImages.length}
                                </p>
                            </div>

                            {/* Thumbnail strip */}
                            <div className="border-t border-white/10 bg-zinc-950/95 px-4 py-4">
                                <div
                                    ref={thumbStripRef}
                                    className="flex gap-3 overflow-x-auto no-scrollbar px-1"
                                >
                                    {galleryImages.map((item, idx) => {
                                        const isActive = idx === selectedIndex;

                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                data-thumb-index={idx}
                                                onClick={() => setSelectedIndex(idx)}
                                                className={`relative h-16 w-24 md:h-20 md:w-28 flex-shrink-0 overflow-hidden rounded-lg border transition-all duration-200 ${
                                                    isActive
                                                        ? "border-white scale-105 ring-2 ring-white/40"
                                                        : "border-white/15 opacity-70 hover:opacity-100 hover:border-white/40"
                                                }`}
                                                aria-label={`View ${item.caption}`}
                                            >
                                                <Image
                                                    src={item.src}
                                                    alt={item.caption}
                                                    fill
                                                    unoptimized={item.src.startsWith("/api/gallery/")}
                                                    className="object-cover"
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}