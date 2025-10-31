'use client'
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';

export default function Home() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return null; // ou um componente de loading
  }

  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
