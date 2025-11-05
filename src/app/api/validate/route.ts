
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura,
// ideal para ambientes serverless como a Vercel.
function initializeFirebaseAdmin() {
  // Evita reinicializações desnecessárias.
  if (admin.apps.length > 0) {
    return;
  }

  // A abordagem mais robusta para a Vercel é usar uma única variável de ambiente
  // contendo o JSON completo da conta de serviço.
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      console.log('[API ROUTE] Initializing Firebase Admin with service account JSON from env var.');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error: any) {
      console.error(
        '[API ROUTE] CRITICAL: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. Ensure it is a valid, single-line JSON string.',
        error.message
      );
    }
  } else {
    // Tenta a inicialização padrão como fallback (útil para outros ambientes Google Cloud)
    // mas avisa se a variável principal estiver em falta.
    console.warn(
      '[API ROUTE] WARNING: FIREBASE_SERVICE_ACCOUNT_JSON env var not found. Attempting default initialization. This might fail.'
    );
    try {
      admin.initializeApp();
    } catch (e) {
      console.error('[API ROUTE] CRITICAL: Default Firebase Admin initialization failed.');
    }
  }
}

export async function GET(req: NextRequest) {
  // Garante que a inicialização é tentada em cada request, mas só executa uma vez.
  initializeFirebaseAdmin();

  // Garante que o SDK está pronto antes de tentar usá-lo.
  if (!admin.apps.length || !admin.app().options.credential) {
    const errorMessage =
      '[API ROUTE] Falha crítica: Firebase Admin não pôde ser inicializado. Verifique as credenciais do servidor e a variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON.';
    console.error(errorMessage);
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
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
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
