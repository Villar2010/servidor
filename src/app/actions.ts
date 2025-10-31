'use server';

import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData, defaultSession } from '@/lib/session';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';

// Ações de Autenticação - Sem acesso direto ao banco de dados.
const adminUser = {
  email: 'coinsnegotiate@gmail.com',
  password: 'Villarinho2010',
};

export const getSession = async () => {
  noStore(); // Impede o cache da sessão
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  if (!session.isLoggedIn) {
    return defaultSession;
  }
  return {
    isLoggedIn: session.isLoggedIn,
    email: session.email,
  };
};

export const login = async (prevState: any, formData: FormData) => {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (adminUser.email !== email || adminUser.password !== password) {
    return { error: 'Credenciais inválidas.' };
  }

  session.isLoggedIn = true;
  session.email = email;
  await session.save();

  // Não redireciona mais aqui, o cliente fará isso após o login anônimo do Firebase
  return { success: true };
};

export const logout = async () => {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  session.destroy();
  redirect('/login');
};

// As funções getClients, runValidation, addOrUpdateClient, deleteClient, importClientsFromJson
// foram removidas. A lógica de manipulação de dados agora reside inteiramente no lado do cliente
// (nos componentes React), usando o SDK do cliente Firebase.
