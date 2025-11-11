
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Função para garantir que o Firebase Admin seja inicializado apenas uma vez.
function initializeFirebaseAdmin() {
  // Verifica se já existe uma app inicializada para evitar erros.
  if (admin.apps.length === 0) {
    console.log('[API_VALIDATE] No Firebase Admin app found. Attempting to initialize...');
    
    // Verifica se a variável de ambiente essencial existe.
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      console.error('[API_VALIDATE_FATAL] CRITICAL: FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
      throw new Error('Firebase Admin SDK configuration is missing.');
    }

    try {
      // Parseia as credenciais a partir da variável de ambiente.
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      
      // Inicializa a app com as credenciais.
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[API_VALIDATE_SUCCESS] Firebase Admin SDK initialized successfully.');

    } catch (initError: any) {
      console.error('[API_VALIDATE_INIT_ERROR] CRITICAL: Firebase Admin SDK initialization failed:', initError.message);
      // Lança o erro para ser capturado pelo bloco catch principal da rota.
      throw new Error('Firebase Admin SDK could not be initialized due to a parsing or credential error.');
    }
  } else {
    console.log('[API_VALIDATE] Firebase Admin app already initialized.');
  }
}

export async function GET(req: NextRequest) {
  try {
    // Passo 1: Garante que o Firebase está inicializado.
    initializeFirebaseAdmin();

    // Passo 2: Obtém os parâmetros da query string.
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServerFromRequest = searchParams.get('brokerServer');

    // Passo 3: Valida se os parâmetros necessários foram fornecidos.
    if (!accountNumber || !brokerServerFromRequest) {
      console.log('[VALIDATION_FAIL] Missing parameters:', { accountNumber, brokerServer: brokerServerFromRequest });
      // Devolve 'Bloqueado' se os parâmetros estiverem em falta, pois é uma falha de validação.
      return new NextResponse('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    console.log(`[VALIDATION_START] Received for Account: ${accountNumber}, Server: ${brokerServerFromRequest}`);

    // Passo 4: Acede à base de dados e obtém o documento do cliente.
    const db = admin.firestore();
    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    // Passo 5: Verifica se o cliente existe.
    if (!docSnap.exists) {
      console.log(`[VALIDATION_FAIL] Client not found with accountNumber: ${accountNumber}`);
      return new NextResponse('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Passo 6: Executa a lógica de validação com os dados do cliente.
    const clientData = docSnap.data()!;
    const statusFromDB = clientData.status;
    const brokerServerFromDB = clientData.brokerServer;

    console.log(`[VALIDATION_DATA] DB Status: "${statusFromDB}", DB Server: "${brokerServerFromDB}"`);

    // Validação robusta
    const isStatusLiberado = statusFromDB === 'Liberado';
    // Compara os servidores após limpar espaços e converter para minúsculas para evitar erros.
    const areServersEqual = brokerServerFromDB?.trim().toLowerCase() === brokerServerFromRequest.trim().toLowerCase();

    console.log(`[VALIDATION_CHECK] Status OK: ${isStatusLiberado}, Server OK: ${areServersEqual}`);

    // Passo 7: Devolve o resultado final com base na validação.
    if (isStatusLiberado && areServersEqual) {
      console.log(`[VALIDATION_SUCCESS] Final result for ${accountNumber}: Liberado`);
      return new NextResponse('Liberado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } else {
      if (!isStatusLiberado) console.log(`[VALIDATION_FAIL] Reason: Status is not 'Liberado'.`);
      if (!areServersEqual) console.log(`[VALIDATION_FAIL] Reason: Server mismatch.`);
      
      console.log(`[VALIDATION_FAIL] Final result for ${accountNumber}: Bloqueado`);
      return new NextResponse('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

  } catch (error: any) {
    // Bloco catch principal para apanhar qualquer erro inesperado durante a execução.
    console.error('[API_VALIDATE_FATAL_ERROR] An unhandled error occurred in GET handler:', error.message);
    // Devolve uma resposta de erro 500 para indicar um problema no servidor.
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// Handler OPTIONS para CORS pre-flight requests.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
