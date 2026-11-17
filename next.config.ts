import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    // Shared-hosting build environments may advertise many CPUs but limit threads.
    // Prevent page-data collection from spawning dozens of workers on Hostinger.
    experimental: {
        cpus: 2,
    },
    images: {
        qualities: [75, 100],
    },
};

export default nextConfig;
