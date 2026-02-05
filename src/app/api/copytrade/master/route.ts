import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountString) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set.");
      const serviceAccount = JSON.parse(serviceAccountString);
      const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: privateKey,
        }),
      });
    } catch (error: any) {
      throw new Error(`Firebase Admin initialization failed: ${error.message}`);
    }
  }
  return admin;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const adminInstance = getFirebaseAdmin();
    const db = adminInstance.firestore();
    const body = await request.json();
    
    // Adaptando para o formato que o robô envia: { master_id, order: { ... } }
    const { master_id, order } = body;

    if (!master_id || !order) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400, headers: corsHeaders });
    }

    // Grava a ordem na subcoleção 'orders' do respectivo Master
    const orderRef = db.collection('copytrade_masters')
                       .doc(master_id)
                       .collection('orders')
                       .doc(String(order.ticket_master));

    await orderRef.set({
      ticket: order.ticket_master,
      symbol: order.symbol,
      type: order.type,
      sl: order.sl,
      tp: order.tp,
      status: order.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("Erro Master API:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function GET() {
    return NextResponse.json({ status: "API Master Online" }, { status: 200, headers: corsHeaders });
}