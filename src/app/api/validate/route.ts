
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Função para inicializar o Firebase Admin SDK de forma segura
function initializeFirebaseAdmin() {
  // Evita reinicializações em ambientes de hot-reload
  if (!admin.apps.length) {
    try {
      // Tenta inicializar com as credenciais do ambiente (funciona no Cloud Workstation e Vercel)
      admin.initializeApp();
      console.log('[API ROUTE] Firebase Admin SDK inicializado com sucesso.');
    } catch (error) {
      console.error('[API ROUTE] Erro ao inicializar Firebase Admin SDK:', error);
    }
  } else {
    console.log('[API ROUTE] Firebase Admin SDK já estava inicializado.');
  }
}

export async function GET(req: NextRequest) {
  // Inicializa o SDK a cada pedido para garantir que esteja pronto em ambientes serverless
  initializeFirebaseAdmin();

  // Garante que o SDK está pronto antes de tentar usá-lo
  if (!admin.apps.length) {
    console.error('[API ROUTE] Falha crítica: Firebase Admin não pôde ser inicializado.');
    // Resposta em texto plano como esperado pelo MT5
    return new Response('Bloqueado', {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*', // CORS
      },
    });
  }

  const db = admin.firestore();
  const { searchParams } = new URL(req.url);
  const accountNumber = searchParams.get('accountNumber');
  const brokerServer = searchParams.get('brokerServer');

  console.log(`[API ROUTE] Recebido pedido para Conta: ${accountNumber}, Servidor: ${brokerServer}`);

  if (!accountNumber || !brokerServer) {
    console.log('[API ROUTE] Falha na validação: Parâmetros em falta.');
    return new Response('Bloqueado', {
      status: 400,
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = 'Bloqueado'; // Padrão de segurança

    if (docSnap.exists) {
      const client = docSnap.data();
      console.log(`[API ROUTE] Documento encontrado para ${accountNumber}:`, client);

      if (client) {
        // Normaliza as strings para uma comparação robusta
        const brokerServerFromDB = (client.brokerServer || '').trim();
        const statusFromDB = (client.status || 'Bloqueado').trim();
        const brokerServerFromRequest = String(brokerServer).trim();

        console.log(`[API ROUTE] Status da BD: '${statusFromDB}'`);
        console.log(`[API ROUTE] Servidor da BD (normalizado): '${brokerServerFromDB}'`);
        console.log(`[API ROUTE] Servidor do Pedido (normalizado): '${brokerServerFromRequest}'`);

        // Comparação robusta, insensível a maiúsculas/minúsculas
        const areServersEqual = brokerServerFromDB.localeCompare(brokerServerFromRequest, undefined, { sensitivity: 'base' }) === 0;
        
        console.log(`[API ROUTE] Verificação do Servidor (são iguais?): ${areServersEqual}`);
        
        if (statusFromDB === 'Liberado' && areServersEqual) {
          resultText = 'Liberado';
          console.log(`[API ROUTE] SUCESSO: Validação bem-sucedida para ${accountNumber}.`);
        } else {
          console.log(`[API ROUTE] FALHA: A validação não passou. Status é 'Liberado'? ${statusFromDB === 'Liberado'}. Servidores são iguais? ${areServersEqual}.`);
        }
      }
    } else {
      console.log(`[API ROUTE] Cliente não encontrado com o número de conta: ${accountNumber}`);
    }

    console.log(`[API ROUTE] Resultado final para ${accountNumber}: ${resultText}`);
    return new Response(resultText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error('[API ROUTE] Erro inesperado durante a validação:', error);
    return new Response('Bloqueado', {
      status: 500,
      headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

// Handler para pre-flight requests do CORS
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
