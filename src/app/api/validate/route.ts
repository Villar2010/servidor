
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
function initializeFirebaseAdmin() {
  if (!admin.apps.length) {
    try {
      console.log('Initializing Firebase Admin SDK...');
      admin.initializeApp();
      console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  } else {
    console.log('Firebase Admin SDK already initialized.');
  }
}

export async function GET(req: NextRequest) {
  try {
    initializeFirebaseAdmin();
    
    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');

    if (!accountNumber) {
      return new NextResponse("Account number not provided.", { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }

    const clientRef = db.collection("clients").doc(accountNumber);
    const docSnap = await clientRef.get();

    if (!docSnap.exists) {
      const diagnosticText = `Client not found for accountNumber: ${accountNumber}`;
      console.log(diagnosticText);
      return new NextResponse(diagnosticText, {
        status: 404,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const client = docSnap.data();
    const statusFromDB = client?.status || "Not available";
    const brokerServerFromDB = client?.brokerServer || "Not available";

    const diagnosticText = `Status from DB: [${statusFromDB}], Server from DB: [${brokerServerFromDB}]`;
    console.log(`[DIAGNOSTIC] For ${accountNumber}: ${diagnosticText}`);

    return new NextResponse(diagnosticText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error("Error in /api/validate diagnostic function:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return new NextResponse(`Internal Server Error: ${errorMessage}`, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

// Handler para pre-flight requests (CORS)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
