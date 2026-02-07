import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!)),
  });
}

const db = admin.firestore();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Adicionamos 'action' para identificar quando é um comando de fechamento
    const { master_id, order, action } = body;

    if (!master_id) {
      return NextResponse.json({ error: "Master ID ausente" }, { status: 400 });
    }

    // --- LÓGICA DE FECHAMENTO (CLOSE_ALL) ---
    // Se o Master enviar action: "CLOSE_ALL", limpamos a coleção de ordens
    if (action === "CLOSE_ALL") {
      const ordersRef = db.collection('copytrade_masters')
                         .doc(master_id)
                         .collection('orders');
      
      const snapshot = await ordersRef.get();
      
      if (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }

      return NextResponse.json({ success: true, message: "Ordens limpas com sucesso" });
    }

    // --- LÓGICA DE ABERTURA/ATUALIZAÇÃO ---
    if (!order || !order.ticket_master) {
      return NextResponse.json({ error: "Dados da ordem incompletos" }, { status: 400 });
    }

    const orderRef = db.collection('copytrade_masters')
                       .doc(master_id)
                       .collection('orders')
                       .doc(String(order.ticket_master));

    await orderRef.set({
      symbol: order.symbol,
      type: order.type,
      sl: Number(order.sl) || 0,
      tp: Number(order.tp) || 0,
      status: "OPEN",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Erro interno na API Master:", error.message);
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