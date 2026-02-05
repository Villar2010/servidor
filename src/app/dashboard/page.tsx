'use client';

import ClientTable from '@/components/client-table';
import CopyLicenseTable from '@/components/copy-license-table';
import LogoutButton from '@/components/logout-button';
import { Separator } from '@/components/ui/separator';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Se o carregamento terminou e não há usuário, redireciona para o login.
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Exibe um loader enquanto a autenticação está sendo verificada
  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-muted/40">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificando autenticação...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
        <h1 className="text-xl font-semibold">Dashboard de Licenças</h1>
        <div className="ml-auto">
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
        <div className="grid auto-rows-max items-start gap-4 md:gap-8">
          <ClientTable />
          <Separator className="my-4" />
          <CopyLicenseTable />
        </div>
      </main>
    </div>
  );
}
