import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import TrackingClient from './TrackingClient';

export default async function TrackingPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name,
    nia: session.nia,
  };

  return <TrackingClient user={user} />;
}
