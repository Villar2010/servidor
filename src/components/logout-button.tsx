'use client';

import { useTransition } from 'react';
import { Button } from './ui/button';
import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    startTransition(async () => {
      if (auth) {
        await signOut(auth);
        // O redirecionamento será tratado pelo DashboardPage ou outras páginas
        // que verificam o estado de autenticação.
         router.push('/login');
      }
    });
  };

  return (
    <Button onClick={handleLogout} variant="ghost" disabled={isPending || !auth}>
      {isPending ? (
        <Loader2 className="mr-2 animate-spin" />
      ) : (
        <LogOut className="mr-2" />
      )}
      Sair
    </Button>
  );
}
