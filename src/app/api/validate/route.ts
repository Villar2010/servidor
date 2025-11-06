
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// As credenciais de serviço são agora importadas de uma forma que a Vercel consegue detetar.
// Em desenvolvimento, ele tentará usar as variáveis de ambiente do seu .env.local se existirem.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? 
  JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) : 
  null;

// A inicialização é feita uma única vez de forma segura.
if (!admin.apps.length) {
  try {
    // Tenta inicializar com as credenciais explícitas se existirem.
    // Esta é a abordagem mais robusta para a Vercel.
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fallback para a inicialização padrão, que funciona em alguns ambientes Google Cloud
      // e pode funcionar se as variáveis de ambiente GOOGLE_APPLICATION_CREDENTIALS estiverem definidas.
      admin.initializeApp();
    }
  } catch (e: any) {
    console.error('[API ROUTE] CRITICAL: Firebase Admin SDK initialization failed.', e);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verifica novamente se a inicialização foi bem-sucedida.
    if (!admin.apps.length) {
      console.error('[API ROUTE] Firebase Admin SDK is not initialized.');
      return new Response('Erro no Servidor: Firebase não inicializado.', {
        status: 500,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServer = searchParams.get('brokerServer');

    if (!accountNumber || !brokerServer) {
      return new Response('Erro: Parâmetros accountNumber e brokerServer são obrigatórios.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    if (docSnap.exists) {
      const client = docSnap.data();
      const statusFromDB = client?.status || 'N/A';
      const serverFromDB = client?.brokerServer || 'N/A';
      const diagnosticMessage = `Status from DB: [${statusFromDB}], Server from DB: [${serverFromDB}]`;
      return new Response(diagnosticMessage, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } else {
      const diagnosticMessage = `Client with accountNumber [${accountNumber}] not found.`;
      return new Response(diagnosticMessage, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

  } catch (error: any) {
    console.error('[API ROUTE] Erro inesperado durante o diagnóstico:', error.message);
    return new Response('Erro Interno do Servidor durante o diagnóstico.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// Handler para pre-flight requests do CORS.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
