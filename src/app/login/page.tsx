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
import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword, AuthErrorCodes } from 'firebase/auth';

const adminUser = {
  email: 'coinsnegotiate@gmail.com',
  password: 'Villarinho2010',
};

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // Redireciona se o usuário já estiver logado
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      if (!auth) {
        throw new Error('Serviço de autenticação do Firebase não está disponível.');
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      
      // O useEffect cuidará do redirecionamento
      // router.push('/dashboard');

    } catch (e: any) {
      console.error("Firebase Login process failed:", e);
      if (e.code === AuthErrorCodes.INVALID_LOGIN_CREDENTIALS || e.code === "auth/wrong-password" || e.code === "auth/user-not-found" || e.code === 'auth/invalid-credential') {
        setError("Credenciais inválidas. Verifique seu e-mail e senha. (O utilizador pode não existir na base de dados do Firebase).");
      } else {
        setError(e.message || 'Ocorreu um erro durante o login.');
      }
    } finally {
        setIsPending(false);
    }
  };
  
  // Exibe um loader enquanto verifica o estado do usuário ou se o usuário já existe
  if (isUserLoading || user) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
             <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      )
  }

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
                defaultValue={adminUser.email}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" name="password" required defaultValue={adminUser.password} />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Login</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={isPending || !auth}>
              {isPending ? <Loader2 className="animate-spin" /> : <LogIn />}
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
