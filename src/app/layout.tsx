import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Velvet Lounge",
    description: "厳選されたプレミアムコンテンツ",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased bg-black text-white">
                {children}
            </body>
        </html>
    );
}
