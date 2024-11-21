'use client';

import * as React from 'react';

import Image from "next/image";

import Button from '@mui/material/Button';


export default function Welcome({forInvite}: {forInvite: boolean}) {


  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center">
        <Image
          src="/logo.svg"
          alt="Quickshop logo"
          width={96}
          height={96}
          priority
        />
        <div className={`font-[family-name:var(--font-racing-sans-one)] text-4xl text-orange-500`}>Quickshop</div>
        {forInvite && <div className="max-w-96">It looks like someone has shared a Quickshop shopping list with you via a sharing link.</div> }
        <div className="max-w-96">The Quickshop Android app is currently in developer preview. If you would like to become an early-access tester, please request access.</div>
        {forInvite && <div className="max-w-96">Once you have installed Quickshop, open the sharing link again to view the shopping list.</div>}
        <Button color="warning" variant="contained" href={process.env.NEXT_PUBLIC_QUICKSHOP_APP_DIST_INVITE}>Request access</Button>
        <div>Already have the app installed?</div>
        <Button color="warning" variant="contained" href="quickshop://app/lists/invites/1234">Open Quickshop</Button>
      </main>
    </div>
  );
}