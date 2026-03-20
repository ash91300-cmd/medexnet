import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import FloatingCart from "@/components/FloatingCart";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MedExNet - 약국 간 불용약품 거래 플랫폼",
  description:
    "검증된 약국 간 의약품 거래 플랫폼. 관리자 검수와 에스크로로 안전한 거래를 보장합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          src="//t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
          async
        />
      </head>
      <body
        className={`${notoSansKR.className} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
          <FloatingCart />
        </AuthProvider>
      </body>
    </html>
  );
}
