
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK safely.
function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent errors.
  if (admin.apps.length > 0) {
    return;
  }

  try {
    console.log('[API_ROUTE_INIT] Attempting to initialize Firebase Admin SDK...');
    
    // Vercel environment variables are used here.
    // Ensure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set.
    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      // The private key from the environment variable needs to have its newlines replaced.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };

    // Check if the essential credentials are provided
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        console.error('[API_ROUTE_INIT_ERROR] Critical Firebase credentials are not provided in environment variables.');
        // This will cause the API to fail, which is expected if credentials are not set.
        return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[API_ROUTE_INIT_SUCCESS] Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('[API_ROUTE_INIT_ERROR] Firebase Admin SDK initialization failed catastrophically:', error.message);
  }
}

// Initialize the SDK right away
initializeFirebaseAdmin();

export async function GET(req: NextRequest) {
  // Ensure the SDK is initialized before trying to use its services.
  if (!admin.apps.length) {
    console.error('[API_ROUTE_GET_ERROR] Firebase Admin SDK is not initialized. Cannot process request.');
    // Return a plain text error as expected by MT5
    return new Response('Bloqueado', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServer = searchParams.get('brokerServer');

    if (!accountNumber || !brokerServer) {
      console.log('[VALIDATION_FAIL] Missing parameters:', { accountNumber, brokerServer });
      return new Response('Bloqueado', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    console.log(`[VALIDATION_START] Received for Account: ${accountNumber}, Server: ${brokerServer}`);

    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = 'Bloqueado'; // Default to secure

    if (docSnap.exists) {
      const client = docSnap.data();
      console.log(`[VALIDATION_INFO] Found document for ${accountNumber}:`, client);

      const statusFromDB = client?.status || 'Bloqueado';
      const serverFromDB = (client?.brokerServer || '').trim();
      const serverFromRequest = (brokerServer || '').trim();

      console.log(`[VALIDATION_COMPARE] DB Status: '${statusFromDB}', DB Server: '${serverFromDB}', Req Server: '${serverFromRequest}'`);
      
      // Case-insensitive and robust comparison
      const areServersEqual = serverFromDB.toLowerCase() === serverFromRequest.toLowerCase();

      if (statusFromDB === 'Liberado' && areServersEqual) {
        resultText = 'Liberado';
        console.log(`[VALIDATION_SUCCESS] Match for ${accountNumber}. Status: Liberado.`);
      } else {
        console.log(`[VALIDATION_FAIL] No match for ${accountNumber}. Status check: ${statusFromDB === 'Liberado'}. Server check: ${areServersEqual}.`);
      }
    } else {
      console.log(`[VALIDATION_FAIL] Client not found with accountNumber: ${accountNumber}`);
    }

    console.log(`[VALIDATION_END] Final result for ${accountNumber}: ${resultText}`);
    return new Response(resultText, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });

  } catch (error: any) {
    console.error('[API_ROUTE_GET_ERROR] Unhandled error during validation:', error.message);
    return new Response('Bloqueado', {
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
