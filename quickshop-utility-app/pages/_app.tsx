// These styles apply to every route in the application
import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import localFont from "next/font/local";

const geistSans = localFont({
  src: "../app/fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const racingSansOne = localFont({
  src: "../app/fonts/RacingSansOne-Regular.woff2",
  variable: "--font-racing-sans-one",
  weight: "900",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={`${geistSans.variable} ${racingSansOne.variable}`}> 
      <Component {...pageProps} />
    </main>
  );
}