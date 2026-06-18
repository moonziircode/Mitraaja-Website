import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import CreateOrderClient from './CreateOrderClient';

export default async function CreateOrderPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  const user = {
    name: session.name,
    nia: session.nia,
  };

  return <CreateOrderClient user={user} />;
}
