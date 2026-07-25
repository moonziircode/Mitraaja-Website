import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import SettingsClient from './SettingsClient';

export default async function SettingsPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name,
    nia: session.nia,
  };

  return <SettingsClient user={user} />;
}
