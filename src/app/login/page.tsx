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
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Efeito para redirecionar se o usuário já estiver logado
  useEffect(() => {
    if (!auth) return;

    const checkSessionAndAuth = async () => {
      const session = await getSession();
      if (session.isLoggedIn && auth.currentUser) {
        router.push('/dashboard');
      } else if (session.isLoggedIn && !auth.currentUser) {
        // Tenta logar anonimamente se a sessão existe mas o user do firebase não
        try {
          await signInAnonymously(auth);
          router.push('/dashboard');
        } catch (authError) {
          console.error("Firebase anonymous sign-in failed on session check:", authError);
        }
      }
    };

    checkSessionAndAuth();
  }, [auth, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      // 1. Chamar a API de login
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Falha ao fazer login');
      }

      // 2. Se a API de login for bem-sucedida, autenticar no Firebase
      if (auth) {
        await signInAnonymously(auth);
        // 3. Após autenticar no Firebase, redirecionar
        router.push('/dashboard');
      } else {
        throw new Error('Serviço de autenticação do Firebase não está disponível.');
      }

    } catch (e: any) {
      console.error("Login process failed:", e);
      setError(e.message || 'Ocorreu um erro durante o login.');
      setIsPending(false);
    } 
    // Não defina isPending como false aqui, pois o redirecionamento deve acontecer
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
