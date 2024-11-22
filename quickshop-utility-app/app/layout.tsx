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
      <head>
        <meta property="og:title" content="Quickshop" />
        <meta property="og:description" content="Rocket through your shopping" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://quickshop.buntagon.com/icon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${racingSansOne.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
