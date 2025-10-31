// src/app/api/validate/route.ts
import { initializeFirebase } from '@/firebase/server';
import { Client } from '@/lib/types';
import { doc, getDoc } from 'firebase-admin/firestore';
import { NextRequest } from 'next/server';

/**
 * Lida com requisições GET e POST para validação.
 * Unificado para evitar duplicação de código.
 */
async function handleValidation(request: NextRequest, isPost: boolean): Promise<Response> {
  try {
    let accountNumber: string | null = null;
    let brokerServer: string | null = null;

    if (isPost) {
        try {
            const body = await request.json();
            accountNumber = body.accountNumber;
            brokerServer = body.brokerServer;
        } catch (e) {
            return new Response('Error: Corpo da requisição POST inválido ou ausente.', {
                status: 400,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
    } else {
        const { searchParams } = new URL(request.url);
        // Acessa os parâmetros diretamente com .get() para evitar a enumeração
        accountNumber = searchParams.get('accountNumber');
        brokerServer = searchParams.get('brokerServer');
    }

    if (!accountNumber || !brokerServer) {
      return new Response('Error: Os parâmetros accountNumber e brokerServer são obrigatórios.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

     // Usa o SDK Admin do Firebase (server-side)
     const { db } = await initializeFirebase();
     const clientRef = doc(db, 'clients', accountNumber);
     const docSnap = await getDoc(clientRef);

     let result: { status: 'authorized' | 'blocked', reason: string };

     if (docSnap.exists()) {
         const client = docSnap.data() as Client;
         if (client.brokerServer === brokerServer) {
             if (client.status === 'Liberado') {
                 result = { status: 'authorized', reason: 'Cliente encontrado e com status liberado.' };
             } else {
                 result = { status: 'blocked', reason: `Cliente encontrado, mas status é '${client.status}'.` };
             }
         } else {
              result = { status: 'blocked', reason: 'Servidor da corretora não corresponde.' };
         }
     } else {
        result = { status: 'blocked', reason: 'Cliente não encontrado na base de dados.' };
     }

    // Retorna o status como texto simples para compatibilidade com MT5
    return new Response(result.status === 'authorized' ? 'Liberado' : 'Bloqueado', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });

  } catch (error) {
    console.error(`API Validate ${isPost ? 'POST' : 'GET'} Error:`, error);
    // Em caso de erro, retorna 'Bloqueado' para segurança
    return new Response('Bloqueado', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

export async function GET(request: NextRequest): Promise<Response> {
    return handleValidation(request, false);
}

export async function POST(request: NextRequest): Promise<Response> {
    return handleValidation(request, true);
}
