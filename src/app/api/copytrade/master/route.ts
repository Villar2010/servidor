import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!);
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin;
}

export async function POST(request: Request) {
  try {
    const adminInstance = getFirebaseAdmin();
    const db = adminInstance.firestore();
    const body = await request.json();
    const { master_id, order } = body;

    if (!master_id || !order) return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });

    // Usa o ticket_master vindo do MT5 para criar o documento com dados reais
    const orderRef = db.collection('copytrade_masters')
                       .doc(master_id)
                       .collection('orders')
                       .doc(String(order.ticket_master));

    await orderRef.set({
      ticket: order.ticket_master,
      symbol: order.symbol,
      type: order.type,
      sl: order.sl || 0,
      tp: order.tp || 0,
      status: "OPEN",
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type' 
  }});
}