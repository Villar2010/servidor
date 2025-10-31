// src/app/api/validate/route.ts
import { NextRequest } from 'next/server';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { Client } from '@/lib/types';

// Variável para armazenar a instância do Firebase Admin para reutilização
let adminApp: App | null = null;

/**
 * Inicializa o Firebase Admin SDK de forma robusta, garantindo que não haja múltiplas inicializações.
 * A instância é criada e reutilizada entre as chamadas de função no mesmo ambiente de execução.
 */
function getFirebaseAdmin() {
  if (adminApp) {
    return { app: adminApp, db: getFirestore(adminApp) };
  }

  // Se já houver apps inicializadas, reutiliza a primeira.
  // Essencial para ambientes serverless como a Vercel.
  if (getApps().length > 0) {
    adminApp = getApp();
    return { app: adminApp, db: getFirestore(adminApp) };
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
  }

  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
    return { app: adminApp, db: getFirestore(adminApp) };
  } catch (e) {
    console.error('Falha ao inicializar Firebase Admin SDK:', e);
    throw new Error('Não foi possível inicializar o Firebase Admin SDK.');
  }
}

/**
 * Lida com requisições GET e POST para validação.
 * Unificado para evitar duplicação de código.
 */
async function handleValidation(request: NextRequest, isPost: boolean): Promise<Response> {
  const endpointType = isPost ? 'POST' : 'GET';
  console.log(`[${endpointType}] /api/validate - Recebida requisição.`);

  try {
    let accountNumber: string | null = null;
    let brokerServer: string | null = null;

    if (isPost) {
      try {
        const body = await request.json();
        accountNumber = body.accountNumber;
        brokerServer = body.brokerServer;
      } catch (e) {
        console.error(`[${endpointType}] /api/validate - Erro ao analisar corpo da requisição:`, e);
        return new Response('Error: Corpo da requisição POST inválido ou ausente.', {
          status: 400,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    } else {
      const { searchParams } = new URL(request.url);
      accountNumber = searchParams.get('accountNumber');
      brokerServer = searchParams.get('brokerServer');
    }
    
    console.log(`[${endpointType}] /api/validate - Parâmetros: accountNumber=${accountNumber}, brokerServer=${brokerServer}`);

    if (!accountNumber || !brokerServer) {
      console.warn(`[${endpointType}] /api/validate - Parâmetros obrigatórios ausentes.`);
      return new Response('Error: Os parâmetros accountNumber e brokerServer são obrigatórios.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const { db } = getFirebaseAdmin();
    const clientRef = db.doc(`clients/${accountNumber}`);
    const docSnap = await clientRef.get();

    let resultText: 'Liberado' | 'Bloqueado';
    let reason: string;

    if (docSnap.exists) {
      const client = docSnap.data() as Client;
      console.log(`[${endpointType}] /api/validate - Cliente ${accountNumber} encontrado. Dados:`, client);

      // Normaliza as strings para comparação robusta
      const brokerServerFromDB = client.brokerServer?.trim().toLowerCase();
      const brokerServerFromRequest = brokerServer.trim().toLowerCase();
      
      console.log(`[${endpointType}] /api/validate - Comparando servidores: DB='${brokerServerFromDB}' vs Request='${brokerServerFromRequest}'`);

      if (brokerServerFromDB === brokerServerFromRequest) {
        if (client.status === 'Liberado') {
          resultText = 'Liberado';
          reason = 'Cliente encontrado e com status liberado.';
        } else {
          resultText = 'Bloqueado';
          reason = `Cliente encontrado, mas o status é '${client.status}'.`;
        }
      } else {
        resultText = 'Bloqueado';
        reason = 'O servidor da corretora não corresponde.';
      }
    } else {
      resultText = 'Bloqueado';
      reason = 'Cliente não encontrado na base de dados.';
    }

    console.log(`[${endpointType}] /api/validate - Resultado para ${accountNumber}: ${resultText}. Motivo: ${reason}`);
    return new Response(resultText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error(`[${endpointType}] /api/validate - Erro interno do servidor:`, error);
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
