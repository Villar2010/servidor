
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura.
// Garante que a inicialização ocorre apenas uma vez.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }
  
  // Tenta a inicialização padrão. Em ambientes como a Vercel,
  // isto deve detetar as credenciais automaticamente.
  admin.initializeApp();
}

export async function GET(req: NextRequest) {
  try {
    initializeFirebaseAdmin();

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

  } catch (error: any) {
    // Se ocorrer qualquer erro, regista-o para depuração na Vercel
    // e retorna uma resposta de erro controlada.
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
