
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK safely.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    console.log('[API_ROUTE_INIT] Attempting to initialize Firebase Admin SDK...');
    
    // This is the recommended approach for Vercel.
    // It expects a single environment variable `FIREBASE_SERVICE_ACCOUNT_JSON`
    // containing the full JSON string of the service account key.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[API_ROUTE_INIT_SUCCESS] Firebase Admin SDK initialized successfully.');

  } catch (error: any) {
    console.error('[API_ROUTE_INIT_ERROR] Firebase Admin SDK initialization failed catastrophically:', error.message);
    // This error will be caught by the main handler's try-catch block.
    throw new Error('Firebase Admin SDK could not be initialized.');
  }
}


export async function GET(req: NextRequest) {
  try {
    // Ensure the SDK is initialized before trying to use its services.
    initializeFirebaseAdmin();

    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServer = searchParams.get('brokerServer');

    if (!accountNumber || !brokerServer) {
      console.log('[DIAGNOSTICS_FAIL] Missing parameters:', { accountNumber, brokerServer });
      return new Response('Missing accountNumber or brokerServer parameter.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    console.log(`[DIAGNOSTICS_START] Received for Account: ${accountNumber}, Server: ${brokerServer}`);

    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    if (docSnap.exists) {
      const client = docSnap.data();
      const statusFromDB = client?.status || 'N/A';
      const serverFromDB = client?.brokerServer || 'N/A';
      
      const diagnosticMessage = `Status from DB: ${statusFromDB}, Server from DB: ${serverFromDB}`;
      
      console.log(`[DIAGNOSTICS_RESULT] For ${accountNumber}: ${diagnosticMessage}`);
      
      return new Response(diagnosticMessage, {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } else {
      console.log(`[DIAGNOSTICS_FAIL] Client not found with accountNumber: ${accountNumber}`);
      return new Response(`Client not found in DB: ${accountNumber}`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

  } catch (error: any) {
    console.error('[API_ROUTE_GET_ERROR] Unhandled error during diagnosis:', error.message);
    return new Response('Internal Server Error during diagnosis.', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// OPTIONS handler for CORS pre-flight requests.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
