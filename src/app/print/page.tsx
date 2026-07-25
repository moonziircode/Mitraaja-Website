import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import PrintClient from './PrintClient';

export default async function PrintPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name || 'Agent',
    nia: session.nia || '',
  };

  return <PrintClient user={user} />;
}
