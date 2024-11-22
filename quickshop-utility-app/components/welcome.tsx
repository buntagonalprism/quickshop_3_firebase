'use client';

import * as React from 'react';

import Image from "next/image";

import Button from '@mui/material/Button';
import { usePathname } from 'next/navigation';


export default function Welcome() {

  const pathname = usePathname() || "";

  const isListInvite = /^\/lists\/invites\/[0-9a-fA-F-]{36}$/.test(pathname);

  let appLink = "quickshop://" + process.env.NEXT_PUBLIC_QUICKSHOP_ANDROID_CUSTOM_SCHEME_HOST;

  if (isListInvite) {
    appLink += pathname;
  }

  console.log("appLink: " + appLink);

  return (
    <div className="flex items-center justify-center min-h-screen p-8 pb-10 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-7 row-start-2 items-center">
        <Image
          src="/logo.svg"
          alt="Quickshop logo"
          width={96}
          height={96}
          priority
        />
        <div className={`font-[family-name:var(--font-racing-sans-one)] text-4xl text-orange-500`}>Quickshop</div>
        {isListInvite && <div className="max-w-96">It looks like someone has shared a Quickshop shopping list with you via a sharing link.</div> }
        <div className="max-w-96">The Quickshop Android app is currently in developer preview. If you would like to become an early-access tester, please request access.</div>
        <Button color="warning" variant="contained" href={process.env.NEXT_PUBLIC_QUICKSHOP_APP_DIST_INVITE}>Request access</Button>
        <div>Already have the app installed?</div>
        <Button color="warning" variant="contained" href={appLink}>Open Quickshop</Button>
      </main>
    </div>
  );
}