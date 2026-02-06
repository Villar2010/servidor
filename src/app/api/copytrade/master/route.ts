import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Inicialização segura do Firebase Admin
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)),
  });
}

const db = admin.firestore();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { master_id, order } = body;

    if (!master_id || !order) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    // Gravação no Firestore (Caminho: copytrade_masters -> ID -> orders -> TICKET)
    const orderRef = db.collection('copytrade_masters')
                       .doc(master_id)
                       .collection('orders')
                       .doc(String(order.ticket_master));

    await orderRef.set({
      symbol: order.symbol,
      type: order.type,
      sl: order.sl || 0,
      tp: order.tp || 0,
      status: "OPEN",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Erro na API Master:", error.message);
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