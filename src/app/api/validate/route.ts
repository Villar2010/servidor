
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

  try {
    // Vercel populates environment variables from the project settings.
    // This is the recommended approach. It expects a single environment variable
    // `FIREBASE_SERVICE_ACCOUNT_JSON` containing the full JSON string of the service account key.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[API_VALIDATE_SUCCESS] Firebase Admin SDK initialized successfully.');

  } catch (error: any) {
    console.error('[API_VALIDATE_INIT_ERROR] Firebase Admin SDK initialization failed catastrophically:', error.message);
    // This error will be caught by the main handler's try-catch block and will
    // result in a controlled 500 error response instead of a crash.
    throw new Error('Firebase Admin SDK could not be initialized.');
  }
}

export async function GET(req: NextRequest) {
  try {
    // This function will initialize Firebase Admin SDK only if it hasn't been already.
    initializeFirebaseAdmin();

    // Get the Firestore database instance.
    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServerFromRequest = searchParams.get('brokerServer');

    // Validate input parameters.
    if (!accountNumber || !brokerServerFromRequest) {
      console.log('[VALIDATION_FAIL] Missing parameters:', { accountNumber, brokerServer: brokerServerFromRequest });
      return new Response('Missing accountNumber or brokerServer parameter.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    console.log(`[VALIDATION_START] Received for Account: ${accountNumber}, Server: ${brokerServerFromRequest}`);

    // Fetch the client document from Firestore.
    const clientRef = db.collection('clients').doc(String(accountNumber));
    const docSnap = await clientRef.get();

    // Handle case where client document doesn't exist.
    if (!docSnap.exists) {
      console.log(`[VALIDATION_FAIL] Client not found with accountNumber: ${accountNumber}`);
      return new Response('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    // Extract data from the document.
    const client = docSnap.data()!;
    const statusFromDB = client.status;
    const brokerServerFromDB = client.brokerServer;

    console.log(`[VALIDATION_DATA] DB Status: "${statusFromDB}", DB Server: "${brokerServerFromDB}"`);

    // Perform the validation logic.
    const isStatusLiberado = statusFromDB === 'Liberado';
    
    // Robust comparison: trim whitespace and ignore case.
    const areServersEqual = brokerServerFromDB.trim().toLowerCase() === brokerServerFromRequest.trim().toLowerCase();

    console.log(`[VALIDATION_CHECK] Status OK: ${isStatusLiberado}, Server OK: ${areServersEqual}`);

    // Return 'Liberado' only if both conditions are met.
    if (isStatusLiberado && areServersEqual) {
      console.log(`[VALIDATION_SUCCESS] Final result for ${accountNumber}: Liberado`);
      return new Response('Liberado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } else {
      console.log(`[VALIDATION_FAIL] Final result for ${accountNumber}: Bloqueado`);
      return new Response('Bloqueado', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

  } catch (error: any) {
    // This generic catch block ensures the server never crashes with an unhandled exception.
    // It will catch errors from `initializeFirebaseAdmin` or any other part of the process.
    console.error('[API_VALIDATE_FATAL_ERROR] An unhandled error occurred:', error.message);
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
