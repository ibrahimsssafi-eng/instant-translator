import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
  variable: "--font-ar",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-en",
  display: "swap",
});

export const metadata: Metadata = {
  title: "المترجم الفوري — وكيل خلفي يترجم كتابتك العربية في أي تطبيق",
  description:
    "وكيل سطح مكتب يعمل في الخلفية متزامنًا مع لوحة المفاتيح: اكتب بالعربية في أي متصفح أو بريد أو برنامج فيُستبدل النص بالترجمة داخل مربع الإدخال نفسه. مع محرر ويب فوري بـ 15 لغة وسجل ترجمات.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
