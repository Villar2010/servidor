
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET(req: NextRequest) {
  try {
    // 1. GARANTIR A INICIALIZAÇÃO SEGURA
    if (admin.apps.length === 0) {
      console.log('[API_VALIDATE] No Firebase Admin app initialized. Attempting to initialize...');
      if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
      }
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('[API_VALIDATE_SUCCESS] Firebase Admin SDK initialized successfully.');
      } catch (initError: any) {
        console.error('[API_VALIDATE_INIT_ERROR] Firebase Admin SDK initialization failed:', initError.message);
        throw new Error('Firebase Admin SDK could not be initialized.');
      }
    }

    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServerFromRequest = searchParams.get('brokerServer');

    // 2. VALIDAR PARÂMETROS
    if (!accountNumber || !brokerServerFromRequest) {
      console.log('[VALIDATION_FAIL] Missing parameters:', { accountNumber, brokerServer: brokerServerFromRequest });
      return new NextResponse('Missing accountNumber or brokerServer parameter.', { status: 400 });
    }

    console.log(`[VALIDATION_START] Received for Account: ${accountNumber}, Server: ${brokerServerFromRequest}`);

    // 3. LER DA BASE DE DADOS
    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    if (!docSnap.exists) {
      console.log(`[VALIDATION_FAIL] Client not found with accountNumber: ${accountNumber}`);
      return new NextResponse('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // 4. EXECUTAR A LÓGICA DE VALIDAÇÃO
    const client = docSnap.data()!;
    const statusFromDB = client.status;
    const brokerServerFromDB = client.brokerServer;

    console.log(`[VALIDATION_DATA] DB Status: "${statusFromDB}", DB Server: "${brokerServerFromDB}"`);

    const isStatusLiberado = statusFromDB === 'Liberado';
    const areServersEqual = brokerServerFromDB.trim().toLowerCase() === brokerServerFromRequest.trim().toLowerCase();

    console.log(`[VALIDATION_CHECK] Status OK: ${isStatusLiberado}, Server OK: ${areServersEqual}`);

    // 5. DEVOLVER O RESULTADO FINAL
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
    // Bloco catch principal para apanhar qualquer erro inesperado
    console.error('[API_VALIDATE_FATAL_ERROR] An unhandled error occurred:', error.message);
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// OPTIONS handler para CORS pre-flight requests.
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
