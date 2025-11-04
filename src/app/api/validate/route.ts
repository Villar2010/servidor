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

  console.log(`[VALIDATION START] Received request for Account: ${accountNumber}, Server: ${brokerServer}`);

  if (!accountNumber || !brokerServer) {
    console.log("[VALIDATION FAIL] Missing parameters:", { accountNumber, brokerServer });
    return new NextResponse("Bloqueado", { status: 400, headers });
  }

  try {
    const clientRef = db.collection("clients").doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = 'Bloqueado'; // Padrão de segurança

    if (docSnap.exists) {
      const client = docSnap.data();
      console.log(`[VALIDATION INFO] Found document for ${accountNumber}:`, client);
      
      if (client) {
        const brokerServerFromDB = client.brokerServer || '';
        const statusFromDB = client.status || 'Bloqueado';

        const normalizedBrokerServerFromDB = brokerServerFromDB.trim();
        const normalizedBrokerServerFromRequest = String(brokerServer).trim();

        console.log(`[VALIDATION COMPARE] Status from DB: '${statusFromDB}'`);
        console.log(`[VALIDATION COMPARE] Broker from DB (normalized): '${normalizedBrokerServerFromDB}'`);
        console.log(`[VALIDATION COMPARE] Broker from Request (normalized): '${normalizedBrokerServerFromRequest}'`);
        
        // Comparação robusta de strings que ignora maiúsculas/minúsculas e caracteres variantes.
        const areServersEqual = normalizedBrokerServerFromDB.localeCompare(
            normalizedBrokerServerFromRequest,
            undefined, // Usa a localidade padrão
            { sensitivity: 'base', ignorePunctuation: true }
        ) === 0;
        
        console.log(`[VALIDATION CHECK] Are servers equal (robust compare): ${areServersEqual}`);

        if (statusFromDB === 'Liberado' && areServersEqual) {
          resultText = 'Liberado';
          console.log(`[VALIDATION SUCCESS] Match for ${accountNumber}. Status: Liberado.`);
        } else {
             console.log(`[VALIDATION FAIL] No match for ${accountNumber}. Status check: ${statusFromDB === 'Liberado'}. Server check: ${areServersEqual}.`);
        }
      }
    } else {
      console.log(`[VALIDATION FAIL] Client not found with accountNumber: ${accountNumber}`);
    }
    
    console.log(`[VALIDATION END] Final result for ${accountNumber}: ${resultText}`);
    return new NextResponse(resultText, { status: 200, headers });

  } catch (error) {
    console.error(`[VALIDATION ERROR] Error during validation for accountNumber ${accountNumber}:`, error);
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
