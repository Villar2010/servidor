
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK safely.
// It ensures initialization only happens once.
function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent errors.
  if (admin.apps.length > 0) {
    return;
  }

  console.log('[API_VALIDATE] Attempting to initialize Firebase Admin SDK...');

  // This is the recommended approach for Vercel. It expects a single environment variable
  // `FIREBASE_SERVICE_ACCOUNT_JSON` containing the full JSON string of the service account key.
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set.');
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[API_VALIDATE_SUCCESS] Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('[API_VALIDATE_INIT_ERROR] Firebase Admin SDK initialization failed catastrophically:', error.message);
    // This error will be caught by the main handler's try-catch block and will
    // result in a controlled 500 error response instead of a crash.
    throw new Error('Firebase Admin SDK could not be initialized. Check the service account JSON.');
  }
}

export async function GET(req: NextRequest) {
  try {
    // This function will initialize Firebase Admin SDK only if it hasn't been already.
    initializeFirebaseAdmin();

    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServerFromRequest = searchParams.get('brokerServer');

    if (!accountNumber || !brokerServerFromRequest) {
      console.log('[VALIDATION_FAIL] Missing parameters:', { accountNumber, brokerServer: brokerServerFromRequest });
      // Although MT5 expects plain text, returning a NextResponse is safer.
      return new NextResponse('Missing accountNumber or brokerServer parameter.', { status: 400 });
    }

    console.log(`[VALIDATION_START] Received for Account: ${accountNumber}, Server: ${brokerServerFromRequest}`);

    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    if (!docSnap.exists) {
      console.log(`[VALIDATION_FAIL] Client not found with accountNumber: ${accountNumber}`);
      return new NextResponse('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const client = docSnap.data()!;
    const statusFromDB = client.status;
    const brokerServerFromDB = client.brokerServer;

    console.log(`[VALIDATION_DATA] DB Status: "${statusFromDB}", DB Server: "${brokerServerFromDB}"`);

    const isStatusLiberado = statusFromDB === 'Liberado';
    
    // Robust comparison: trim whitespace and ignore case.
    const areServersEqual = brokerServerFromDB.trim().toLowerCase() === brokerServerFromRequest.trim().toLowerCase();

    console.log(`[VALIDATION_CHECK] Status OK: ${isStatusLiberado}, Server OK: ${areServersEqual}`);

    if (isStatusLiberado && areServersEqual) {
      console.log(`[VALIDATION_SUCCESS] Final result for ${accountNumber}: Liberado`);
      return new NextResponse('Liberado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } else {
      if (!isStatusLiberado) {
        console.log(`[VALIDATION_FAIL] Reason: Status is not 'Liberado'. It is '${statusFromDB}'.`);
      }
      if (!areServersEqual) {
        console.log(`[VALIDATION_FAIL] Reason: Server mismatch. Request: '${brokerServerFromRequest}', DB: '${brokerServerFromDB}'.`);
      }
      console.log(`[VALIDATION_FAIL] Final result for ${accountNumber}: Bloqueado`);
      return new NextResponse('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

  } catch (error: any) {
    console.error('[API_VALIDATE_FATAL_ERROR] An unhandled error occurred:', error.message);
    return new NextResponse('Internal Server Error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// OPTIONS handler for CORS pre-flight requests.
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
