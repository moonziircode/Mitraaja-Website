import React from "react";
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TasklistClient from "./TasklistClient";

export const metadata = {
  title: "Tertunda - Mitraaja",
  description: "Daftar paket tertunda Anteraja",
};

export default async function TasklistPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name,
    nia: session.nia,
  };

  return <TasklistClient user={user} />;
}
