import type { Metadata, Viewport } from "next";
import { Cairo, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

/**
 * القراءة/النصوص الأساسية: Noto Sans Arabic (واضح جداً للنصوص الطويلة والأسئلة)
 * العناوين الكبيرة/لوحة الصدارة: Cairo Black كبديل عند عدم توفر خط تراثي محلي
 *
 * ملاحظة: الخط التراثي (مثل Turban Genie / Kufi) يُفترض توفره محلياً/ذاتياً عبر CSS،
 * ونجهّز له CSS Variable لاستخدامه حصراً في العناوين عند توفره.
 */
const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-ar-body",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
});

const cairo = Cairo({
  variable: "--font-ar-display-fallback",
  subsets: ["arabic"],
  weight: ["900"], // Black للعناوين الضخمة
});

const siteUrl = new URL("http://localhost:3000");

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

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
      className={[
        // body font
        notoSansArabic.variable,
        // display fallback
        cairo.variable,
        // custom local display font (if provided in CSS)
        "h-full antialiased",
      ].join(" ")}
    >
      <body
        suppressHydrationWarning
        className={[
          "min-h-full flex flex-col",
          // default reading font
          "font-(--font-ar-body)",
          // Expose display font stack:
          // - --font-ar-display: expected to be defined in globals.css as a local font-family name
          // - fallback to Cairo Black when not defined
          "[--font-ar-display:var(--font-ar-display,var(--font-ar-display-fallback))]",
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}
