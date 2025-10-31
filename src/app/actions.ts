'use server';

import { getIronSession } from 'iron-session';
import { sessionOptions } from '@/lib/session';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

// Esta função de logout agora é a única interação necessária com a sessão do servidor.
// Ela simplesmente destrói o cookie da sessão.
export const logout = async () => {
  const session = await getIronSession(cookies(), sessionOptions);
  session.destroy();
  // O redirecionamento para /login é tratado no cliente pelo provider do Firebase.
  // Mas podemos forçar aqui para garantir.
  redirect('/login');
};
