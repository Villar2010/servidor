
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura e robusta.
function initializeFirebaseAdmin() {
  // Evita reinicializações em ambientes de hot-reload
  if (admin.apps.length > 0) {
    return;
  }

  // As credenciais são carregadas das variáveis de ambiente.
  // No build da Vercel, estas variáveis podem não estar presentes, por isso verificamos.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  // Só tenta inicializar se as credenciais estiverem disponíveis.
  // Isso impede que o processo de build da Vercel falhe.
  if (privateKey && clientEmail && projectId) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          // A chave privada precisa de ter os caracteres de nova linha restaurados.
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
        console.error('[API ROUTE] Erro CRÍTICO na inicialização do Firebase Admin:', error);
    }
  } else {
    // Em produção (Vercel), se as variáveis não estiverem definidas,
    // podemos tentar a inicialização padrão que usa as credenciais do ambiente.
    // Em desenvolvimento, isso pode não funcionar se as variáveis não estiverem no .env
    try {
        admin.initializeApp();
    } catch(e) {
        console.log('[API ROUTE] Tentativa de inicialização padrão falhou. Verifique as variáveis de ambiente.');
    }
  }
}

export async function GET(req: NextRequest) {
  // Garante que a inicialização é tentada em cada request, mas só executa uma vez.
  initializeFirebaseAdmin();

  // Garante que o SDK está pronto antes de tentar usá-lo.
  if (!admin.apps.length || !admin.app().options.credential) {
    const errorMessage = '[API ROUTE] Falha crítica: Firebase Admin não pôde ser inicializado. Verifique as credenciais do servidor e as variáveis de ambiente.';
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
