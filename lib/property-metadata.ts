import type { Metadata } from "next";

export function propertyMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    applicationName: "格安不動産サーチ",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
      ],
      shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
    },
    appleWebApp: {
      capable: true,
      title: "格安不動産",
      statusBarStyle: "default"
    },
    openGraph: {
      title,
      description,
      siteName: "格安不動産サーチ",
      type: "website"
    }
  };
}
