import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const racingSansOne = localFont({
  src: "./fonts/RacingSansOne-Regular.woff2",
  variable: "--font-racing-sans-one",
  weight: "900",
});

export const metadata: Metadata = {
  title: "Quickshop",
  description: "Rocket through your shopping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${racingSansOne.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
