import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
if (!admin.apps.length) {
  // Em um ambiente de produção real (como Vercel ou App Hosting),
  // as credenciais de serviço são descobertas automaticamente.
  // Para desenvolvimento local, você precisaria configurar o GOOGLE_APPLICATION_CREDENTIALS.
  // Como estamos no Firebase Studio, isso é tratado para nós.
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Lida com pedidos GET para validar a licença de um cliente MT5.
 * @param {NextRequest} request - O objeto de requisição do Next.js.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountNumber = searchParams.get('accountNumber');
  const brokerServer = searchParams.get('brokerServer');

  // Adiciona os headers CORS à resposta para permitir o acesso de domínios externos.
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'text/plain',
  };

  if (!accountNumber || !brokerServer) {
    console.log("Parâmetros ausentes:", { accountNumber, brokerServer });
    return new NextResponse("Bloqueado", { status: 400, headers });
  }

  try {
    const clientRef = db.collection("clients").doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = 'Bloqueado'; // Padrão de segurança

    if (docSnap.exists) {
      const client = docSnap.data();
      
      if (client) {
        const brokerServerFromDB = client.brokerServer?.trim().toLowerCase() || '';
        const normalizedBrokerServerFromRequest = String(brokerServer).trim().toLowerCase();

        // Compara o status e os servidores normalizados
        if (client.status === 'Liberado' && brokerServerFromDB === normalizedBrokerServerFromRequest) {
          resultText = 'Liberado';
        } else {
             console.log(`Validação falhou para ${accountNumber}. Status: ${client.status}, DB Server: '${brokerServerFromDB}', Req Server: '${normalizedBrokerServerFromRequest}'`);
        }
      }
    } else {
      console.log(`Cliente não encontrado com o accountNumber: ${accountNumber}`);
    }
    
    // Retorna o resultado como texto simples
    return new NextResponse(resultText, { status: 200, headers });

  } catch (error) {
    console.error(`Erro na validação para accountNumber ${accountNumber}:`, error);
    // Em caso de erro interno no servidor, retorna 'Bloqueado' por segurança
    return new NextResponse("Bloqueado", { status: 500, headers });
  }
}

/**
 * Lida com requisições OPTIONS para pre-flight checks do CORS.
 */
export async function OPTIONS(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  return new NextResponse(null, { status: 204, headers });
}
