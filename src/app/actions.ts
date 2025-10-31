'use server';

import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, defaultSession } from '@/lib/session';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

export const getSession = async () => {
  noStore();
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  
  if (!session.isLoggedIn) {
    // A modificação de cookies só é permitida em Server Actions ou Route Handlers.
    // Não destrua a sessão aqui. Apenas retorne o estado padrão.
    return defaultSession;
  }

  return {
    isLoggedIn: session.isLoggedIn,
    email: session.email,
  };
};

export const logout = async () => {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();
  redirect('/login');
};
