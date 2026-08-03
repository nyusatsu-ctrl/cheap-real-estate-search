import type { Metadata } from "next";
import { DIAGNOSIS_APP_NAME, DIAGNOSIS_DESCRIPTION, getDiagnosisBaseUrl } from "@/lib/diagnosis-brand";
import "./diagnosis-print.css";

export const metadata: Metadata = {
  metadataBase: new URL(getDiagnosisBaseUrl()),
  title: DIAGNOSIS_APP_NAME,
  description: DIAGNOSIS_DESCRIPTION,
  robots: {
    index: false,
    follow: false
  },
  openGraph: {
    title: DIAGNOSIS_APP_NAME,
    description: DIAGNOSIS_DESCRIPTION,
    siteName: DIAGNOSIS_APP_NAME,
    images: [
      {
        url: "/images/ecoloop-sales-diagnosis-logo.png",
        width: 1914,
        height: 822,
        alt: DIAGNOSIS_APP_NAME
      }
    ],
    type: "website"
  }
};

export default function DiagnosisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
