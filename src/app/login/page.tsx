'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { login, getSession } from '@/app/actions';
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
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <LogIn />}
      Entrar
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState(login, undefined);
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Se o formulário de login do servidor foi bem-sucedido, redireciona para o dashboard.
    // O dashboard/provider cuidará da lógica de autenticação do Firebase.
    if (state?.success) {
      router.push('/dashboard');
    }
  }, [state, router]);

  // Efeito para garantir que o usuário do Firebase esteja logado se a sessão do servidor existir.
  useEffect(() => {
    if (!auth) return;

    const checkSessionAndAuth = async () => {
      const session = await getSession();
      // Se a sessão do servidor existir, mas o usuário do Firebase não, faça o login anônimo.
      if (session.isLoggedIn && !auth.currentUser) {
        try {
          await signInAnonymously(auth);
          // Redireciona apenas se já estivermos na página de login
          // Isso cobre o caso de um refresh na página de login quando já logado.
          if (window.location.pathname === '/login') {
            router.push('/dashboard');
          }
        } catch (error) {
           console.error("Firebase anonymous sign-in failed:", error);
           toast({
             title: "Erro de Autenticação Firebase",
             description: "Não foi possível autenticar com o Firebase. A página será recarregada.",
             variant: "destructive",
           });
           // Forçar um reload pode resolver problemas de inicialização
           setTimeout(() => window.location.reload(), 2000);
        }
      } else if (session.isLoggedIn && auth.currentUser) {
        // Se ambos existem, vá para o dashboard.
         if (window.location.pathname === '/login') {
            router.push('/dashboard');
         }
      }
    };

    checkSessionAndAuth();
  }, [auth, router, toast]);


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
          <form action={formAction} className="grid gap-4">
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
            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Login</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <LoginButton />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
