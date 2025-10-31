'use client';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';

// Metadata não pode ser exportado de um 'use client' component.
// Você pode movê-lo para um Server Component pai se necessário.
// export const metadata: Metadata = {
//   title: 'Gerenciador de Licenças MT5',
//   description: 'Gerencie licenças de clientes MT5 e status de autorização.',
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <title>Gerenciador de Licenças MT5</title>
        <meta name="description" content="Gerencie licenças de clientes MT5 e status de autorização." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
