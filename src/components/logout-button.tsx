'use client';

import { useTransition } from 'react';
import { logout } from '@/app/actions';
import { Button } from './ui/button';
import { Loader2, LogOut } from 'lucide-react';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <Button onClick={handleLogout} variant="ghost" disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 animate-spin" />
      ) : (
        <LogOut className="mr-2" />
      )}
      Sair
    </Button>
  );
}
