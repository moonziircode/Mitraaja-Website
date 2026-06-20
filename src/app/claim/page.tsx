import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ClaimClient from './ClaimClient';

export default async function ClaimPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name,
    nia: session.nia,
  };

  return <ClaimClient user={user} />;
}
