import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Güverte Teak | Premium Yat Güverte İmalatı",
  description:
    "Lüks yatlar için premium teak güverte imalatı, refit ve bakım hizmetleri. Dünya standartlarında işçilik ve malzeme kalitesi.",
  keywords: [
    "teak güverte",
    "yat imalat",
    "luxury yacht deck",
    "teak refit",
    "marine deck",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className="hide-scrollbar">
      <body className="overflow-x-hidden">{children}</body>
    </html>
  );
}
