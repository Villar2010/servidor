
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura
function initializeFirebaseAdmin() {
  // Evita reinicializações em ambientes de hot-reload
  if (!admin.apps.length) {
    try {
      // Tenta inicializar com as credenciais do ambiente (funciona no Cloud Workstation e Vercel)
      admin.initializeApp();
    } catch (error) {
      // Este erro é esperado durante o build da Vercel, pois as credenciais não estão disponíveis.
      // A inicialização real ocorrerá no ambiente de execução.
      console.log('[API ROUTE] A inicialização do Firebase Admin SDK será adiada para o tempo de execução.');
    }
  }
}

export async function GET(req: NextRequest) {
  initializeFirebaseAdmin();

  // Garante que o SDK está pronto antes de tentar usá-lo
  if (!admin.apps.length) {
    const errorMessage = '[API ROUTE] Falha crítica: Firebase Admin não pôde ser inicializado.';
    console.error(errorMessage);
    return new Response('Erro no Servidor: Firebase não inicializado.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const db = admin.firestore();
  const { searchParams } = new URL(req.url);
  const accountNumber = searchParams.get('accountNumber');
  const brokerServer = searchParams.get('brokerServer');

  if (!accountNumber || !brokerServer) {
    return new Response('Erro: Parâmetros accountNumber e brokerServer são obrigatórios.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  try {
    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let diagnosticMessage = '';

    if (docSnap.exists) {
      const client = docSnap.data();
      const statusFromDB = client?.status || 'N/A';
      const serverFromDB = client?.brokerServer || 'N/A';
      
      // Monta a string de diagnóstico
      diagnosticMessage = `Status from DB: [${statusFromDB}], Server from DB: [${serverFromDB}]`;

    } else {
      diagnosticMessage = `Client with accountNumber [${accountNumber}] not found.`;
    }

    // Retorna a mensagem de diagnóstico
    return new Response(diagnosticMessage, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error) {
    console.error('[API ROUTE] Erro inesperado durante o diagnóstico:', error);
    return new Response('Erro Interno do Servidor durante o diagnóstico.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

// Handler para pre-flight requests do CORS, importante para chamadas externas.
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
