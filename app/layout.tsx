import type { Metadata, Viewport } from "next";
import "react-tabs/style/react-tabs.css";
import "./globals.css";

export const metadata: Metadata = {
    title: "amachiromaker",
    description:
        "Character/item combiner — pick layers, items and colors, then export as PNG or PSD.",
    manifest: "/manifest.json",
    icons: {
        icon: "/favicon.png",
    },
};

export const viewport: Viewport = {
    themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html lang="en">
            <body suppressHydrationWarning>{children}</body>
        </html>
    );
}
