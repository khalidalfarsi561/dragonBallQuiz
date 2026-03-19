import type { Metadata } from "next";
import { Cairo, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
});

const siteUrl = new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "التحدي الأكبر لمحبي دراغون بول العرب - اختبر مستوى طاقتك",
    template: "%s | تحدي دراغون بول",
  },
  description:
    "منصة اختبارات دراغون بول بالعربية (RTL) مع تلعيب ولوحة صدارة لحظية. ارفع مستوى طاقتك وتحدَّ أصدقاءك.",
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "تحدي دراغون بول",
    title: "التحدي الأكبر لمحبي دراغون بول العرب - اختبر مستوى طاقتك",
    description:
      "اختبارات دراغون بول بالعربية مع تلعيب ولوحة صدارة لحظية. شارك مستوى طاقتك وتحدَّ الجميع.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "تحدي دراغون بول - اختبر مستوى طاقتك",
      },
    ],
    locale: "ar_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: "التحدي الأكبر لمحبي دراغون بول العرب - اختبر مستوى طاقتك",
    description: "طاقة الكي الخاصة بك إلى أي مدى وصلت؟ ادخل التحدي الآن.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${cairo.variable} ${ibmPlexArabic.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
