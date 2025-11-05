
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
// A inicialização é movida para dentro da função de request para evitar
// que seja executada durante o processo de build da Vercel, onde as
// credenciais podem não estar disponíveis.
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
    
    // Obtenha a instância do DB somente dentro do handler do request e após a inicialização
    const db = admin.firestore();
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServer = searchParams.get('brokerServer');

    if (!accountNumber || !brokerServer) {
      console.log("[VALIDATION FAIL] Missing parameters:", { accountNumber, brokerServer });
      return new NextResponse("Bloqueado", { status: 400, headers: { 'Content-Type': 'text/plain' } });
    }

    console.log(`[VALIDATION START] Received request for Account: ${accountNumber}, Server: ${brokerServer}`);

    const clientRef = db.collection("clients").doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = "Bloqueado"; 

    if (docSnap.exists) {
      const client = docSnap.data();
      console.log(`[VALIDATION INFO] Found document for ${accountNumber}:`, client);

      if (client) {
        const brokerServerFromDB = client.brokerServer || "";
        const statusFromDB = client.status || "Bloqueado";

        const normalizedBrokerServerFromDB = brokerServerFromDB.trim();
        const normalizedBrokerServerFromRequest = String(brokerServer).trim();

        console.log(`[VALIDATION COMPARE] Status from DB: '${statusFromDB}'`);
        console.log(`[VALIDATION COMPARE] Broker from DB (normalized): '${normalizedBrokerServerFromDB}'`);
        console.log(`[VALIDATION COMPARE] Broker from Request (normalized): '${normalizedBrokerServerFromRequest}'`);

        const areServersEqual = normalizedBrokerServerFromDB.localeCompare(
            normalizedBrokerServerFromRequest,
            undefined,
            { sensitivity: "base", ignorePunctuation: true }
          ) === 0;

        console.log(`[VALIDATION CHECK] Are servers equal (robust compare): ${areServersEqual}`);

        if (statusFromDB === "Liberado" && areServersEqual) {
          resultText = "Liberado";
          console.log(`[VALIDATION SUCCESS] Match for ${accountNumber}. Status: Liberado.`);
        } else {
          console.log(`[VALIDATION FAIL] No match for ${accountNumber}. Status check: ${statusFromDB === "Liberado"}. Server check: ${areServersEqual}.`);
        }
      }
    } else {
      console.log(`[VALIDATION FAIL] Client not found with accountNumber: ${accountNumber}`);
    }

    console.log(`[VALIDATION END] Final result for ${accountNumber}: ${resultText}`);
    
    return new NextResponse(resultText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error("Error in /api/validate function:", error);
    // Em caso de qualquer erro interno, retorne "Bloqueado" por segurança.
    return new NextResponse("Bloqueado", {
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
