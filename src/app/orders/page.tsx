import React from "react";
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import OrdersClient from "./OrdersClient";

export const metadata = {
  title: "Riwayat Order - Mitraaja",
  description: "Daftar riwayat pesanan dan status pembayaran",
};

export default async function OrdersPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name,
    nia: session.nia,
  };

  return <OrdersClient user={user} />;
}
