'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { getSession } from '@/app/actions';
import { signInAnonymously } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Efeito para redirecionar se o usuário já estiver logado (sessão do servidor + auth do firebase)
  useEffect(() => {
    // Não executa a lógica se o auth não estiver pronto
    if (!auth) return;

    const checkSessionAndAuth = async () => {
      // Aguarda a sessão do servidor e o usuário do Firebase
      const session = await getSession();
      // O auth.currentUser pode demorar um pouco para ser preenchido
      // O listener onAuthStateChanged no provider cuida disso
      if (session.isLoggedIn && auth.currentUser) {
        router.push('/dashboard');
      }
    };

    checkSessionAndAuth();
    // A dependência em `auth.currentUser` pode ser útil se ele mudar
  }, [auth, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // 1. Chamar a API de login para criar a sessão do servidor
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao fazer login');
      }

      // 2. Se a API de login for bem-sucedida, autenticar anonimamente no Firebase
      if (!auth) {
        throw new Error('Serviço de autenticação do Firebase não está disponível.');
      }
      
      // ESPERA a autenticação do Firebase ser concluída
      await signInAnonymously(auth);
      
      // 3. APENAS APÓS autenticação no Firebase, redirecionar para o dashboard
      router.push('/dashboard');

    } catch (e: any) {
      console.error("Login process failed:", e);
      setError(e.message || 'Ocorreu um erro durante o login.');
      setIsPending(false);
    } 
    // O isPending só se torna false em caso de erro, 
    // pois em caso de sucesso, a página será redirecionada.
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login de Administrador</CardTitle>
          <CardDescription>
            Entre com seu e-mail e senha para gerenciar as licenças.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" name="password" required />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Login</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
