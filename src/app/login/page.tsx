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
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthErrorCodes, AuthError } from 'firebase/auth';

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

    if (!auth) {
      setError('Serviço de autenticação do Firebase não está disponível.');
      setIsPending(false);
      return;
    }

    try {
      // Tenta fazer o login primeiro
      await signInWithEmailAndPassword(auth, email, password);
      // Se for bem-sucedido, o useEffect cuidará do redirecionamento
    } catch (e: any) {
      // Se o erro for que o usuário não existe, cria o usuário
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          // O login é feito automaticamente após a criação, o useEffect redirecionará
        } catch (creationError: any) {
          console.error("Firebase Creation process failed:", creationError);
          setError(creationError.message || 'Ocorreu um erro ao tentar criar a conta de administrador.');
        }
      } else {
        // Para outros erros de login (senha incorreta, etc.)
        console.error("Firebase Login process failed:", e);
        setError("Credenciais inválidas ou outro erro ocorreu. Verifique o console.");
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
    <div 
        className="flex min-h-screen items-center justify-center bg-cover bg-center px-4"
        style={{ backgroundImage: "url('https://i.postimg.cc/G2B0kWBS/Captura-de-Tela-2025-11-11-a-s-23-37-30.png')" }}
    >
      <Card className="w-full max-w-sm bg-background/80 backdrop-blur-sm">
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
