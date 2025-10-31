// src/app/api/login/route.ts
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const adminUser = {
  email: 'coinsnegotiate@gmail.com',
  password: 'Villarinho2010',
};

export async function POST(request: NextRequest) {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  
  try {
    const { email, password } = await request.json();

    if (adminUser.email !== email || adminUser.password !== password) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    session.isLoggedIn = true;
    session.email = email;
    await session.save();

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('API /login Error:', error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro interno no servidor.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
