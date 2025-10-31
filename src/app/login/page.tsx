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
  const [isFirebaseSigningIn, setIsFirebaseSigningIn] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const session = await getSession();
      if (session.isLoggedIn) {
        // Se já tem sessão, tenta login anônimo e redireciona
        if (auth && !auth.currentUser) {
           signInAnonymously(auth).then(() => {
             router.push('/dashboard');
           }).catch((error) => {
              console.error("Firebase anonymous sign-in error on session check:", error);
           });
        } else if (auth && auth.currentUser) {
            router.push('/dashboard');
        }
      }
    };
    checkSession();
  }, [router, auth]);

  useEffect(() => {
    if (state?.success && auth) {
      setIsFirebaseSigningIn(true);
      signInAnonymously(auth)
        .then(() => {
          router.push('/dashboard');
        })
        .catch((error) => {
          console.error("Firebase anonymous sign-in failed:", error);
          toast({
            title: "Erro de Autenticação Firebase",
            description: "Não foi possível autenticar com o Firebase. Tente novamente.",
            variant: "destructive",
          });
          setIsFirebaseSigningIn(false);
        });
    }
  }, [state, auth, router, toast]);

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
                disabled={isFirebaseSigningIn}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" name="password" required disabled={isFirebaseSigningIn} />
            </div>
            {state?.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro de Login</AlertTitle>
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <LoginButton />
            {isFirebaseSigningIn && <p className="text-center text-sm text-muted-foreground">Autenticando com o Firebase...</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
