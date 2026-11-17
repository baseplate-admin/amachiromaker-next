import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const isStaticExport = process.env.STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
    /* config options here */
    cacheComponents: !isStaticExport,
    partialPrefetching: !isStaticExport,
    productionBrowserSourceMaps: true,
    reactCompiler: true,
    output: isStaticExport ? "export" : "standalone",
    basePath: basePath || undefined,
    images: isStaticExport ? { unoptimized: true } : undefined,
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
};

export default nextConfig;
