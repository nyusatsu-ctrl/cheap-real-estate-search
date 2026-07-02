import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "年収ポテンシャル診断",
  description: "人生最高年収ポテンシャル、年収1,000万円以上到達確率、独立適性、副業適性を診断します。",
  icons: {
    icon: [{ url: "/images/income-potential-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/images/income-potential-icon.svg", type: "image/svg+xml" }]
  },
  openGraph: {
    title: "年収ポテンシャル診断",
    description: "人生最高年収ポテンシャル、年収1,000万円以上到達確率、独立適性、副業適性を診断します。",
    siteName: "年収ポテンシャル診断"
  }
};

export default function IncomePotentialLayout({ children }: { children: React.ReactNode }) {
  return children;
}
