'use client';

import * as React from 'react';

import Image from "next/image";

import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';


export default function Welcome({forInvite}: {forInvite: boolean}) {
  const [email, setEmail] = React.useState('');

  const [hasRegistered, setHasRegistered] = React.useState(false);

  function handleRequestAccess() {
    setHasRegistered(true);
    console.log('Email address: ', email);
  }

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
        {forInvite && <div className="max-w-96">It looks like someone has shared a Quickshop shopping list with you.</div> }
        <div className="max-w-96">Quickshop is currently in developer preview. If you would like to become an early-access tester, please enter your email address below.</div>
        <TextField 
          className="min-w-96 max-w-96"
          id="outlined-basic" 
          label="Email address" 
          variant="outlined" 
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
        />
        <Button color="warning" variant="contained" onClick={handleRequestAccess}>Request access</Button>
        {hasRegistered && <div className="max-w-96">Thanks for registering! You will receive an email with instructions on how to install Quickshop.</div>}
        {forInvite && hasRegistered && <div className="max-w-96">Once you have installed Quickshop, open the link again to view the shopping list.</div>}
      </main>
    </div>
  );
}