
import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
// Em ambientes serverless como a Vercel, o código pode ser executado várias vezes,
// mas a aplicação só deve ser inicializada uma vez.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // A chave privada precisa ser formatada corretamente
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const db = admin.firestore();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const accountNumber = searchParams.get('accountNumber');
    const brokerServer = searchParams.get('brokerServer');

    if (!accountNumber || !brokerServer) {
      console.log("[VALIDATION FAIL] Missing parameters:", { accountNumber, brokerServer });
      return NextResponse.json({ status: "error", message: "Parâmetros 'accountNumber' e 'brokerServer' são obrigatórios." }, { status: 400 });
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
    
    // Retorna texto plano como esperado pelo MT5, com os cabeçalhos CORS corretos.
    return new Response(resultText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error("Error in /api/validate function:", error);
    // Retorna texto plano em caso de erro, com os cabeçalhos CORS.
    return new Response("Bloqueado", {
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }
}

// Handler para pre-flight requests (CORS)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
