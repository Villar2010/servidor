import { getSession } from '@/app/actions';
import ClientTable from '@/components/client-table';
import LogoutButton from '@/components/logout-button';
import { redirect } from 'next/navigation';

// A busca de dados agora é feita no lado do cliente dentro do ClientTable
export default async function DashboardPage() {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect('/login');
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
          {/* ClientTable agora busca e gerencia seus próprios dados no lado do cliente */}
          <ClientTable />
        </div>
      </main>
    </div>
  );
}
