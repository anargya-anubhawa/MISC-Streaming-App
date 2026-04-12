import type { Metadata } from "next";
import ClientLayout from "./layout-client";

export const metadata: Metadata = {
  metadataBase: new URL("https://misc.altehora.web.id"),

  title: "MISC Streaming App",
  description: "Arsip materi digital untuk mahasiswa FK UMY 2025.",

  openGraph: {
    title: "MISC Streaming App",
    description: "Arsip materi digital untuk mahasiswa FK UMY 2025.",
    url: "https://misc.altehora.web.id",
    siteName: "MISC Streaming App",
    images: [
      {
        url: "https://misc.altheora.web.id/thumbnail.jpg",
        width: 1200,
        height: 630,
        alt: "MISC Streaming App",
      },
    ],
    locale: "id_ID",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "MISC Streaming App",
    description: "Arsip materi digital untuk mahasiswa FK UMY 2025.",
    images: ["/thumbnail.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}