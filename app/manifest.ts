import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "格安不動産サーチ",
    short_name: "格安不動産",
    description: "全国の0円物件、空き家、古家付き土地、山林、300万円以下の格安不動産を検索できます。",
    start_url: "/properties",
    display: "standalone",
    background_color: "#061b3d",
    theme_color: "#061b3d",
    lang: "ja",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
