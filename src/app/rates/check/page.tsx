import React from "react";
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import RatesClient from "./RatesClient";

export const metadata = {
  title: "Cek Ongkir - Mitraaja",
  description: "Cek tarif pengiriman Anteraja",
};

export default async function RatesCheckPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name,
    nia: session.nia,
    districtCode: session.districtCode,
    storeName: session.storeName,
  };

  return <RatesClient user={user} />;
}
