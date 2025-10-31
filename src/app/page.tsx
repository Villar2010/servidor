import { getSession } from '@/app/actions';
import { redirect } from 'next/navigation';

export default async function Home() {
  const session = await getSession();
  if (session.isLoggedIn) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
