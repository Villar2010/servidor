import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Inicialização segura do Firebase Admin (apenas uma vez)
if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
      : undefined;

    if (!serviceAccount) {
      console.warn("⚠️ Variável FIREBASE_SERVICE_ACCOUNT_JSON não encontrada. Usando credenciais padrão.");
      admin.initializeApp({ credential: admin.credential.applicationDefault() });
    } else {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
  } catch (error) {
    console.error("❌ Erro ao inicializar Firebase Admin:", error);
  }
}

// Função principal GET
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get("accountNumber");
    const brokerServer = searchParams.get("brokerServer");

    if (!accountNumber) {
      return NextResponse.json({ status: "error", message: "Faltando parâmetro: accountNumber" }, { status: 400 });
    }

    // Busca o cliente no Firestore
    const snapshot = await admin.firestore().collection("clientes").doc(accountNumber).get();

    if (!snapshot.exists) {
      console.log(`🚫 Conta não encontrada: ${accountNumber}`);
      return NextResponse.json({ result: "Bloqueado", motivo: "Conta não cadastrada" }, { status: 200 });
    }

    const data = snapshot.data() || {};

    const statusFromDB = (data.status || "").trim().toLowerCase();
    const brokerFromDB = (data.brokerServer || "").trim().toLowerCase();
    const brokerReceived = (brokerServer || "").trim().toLowerCase();

    console.log(`🔍 Conta: ${accountNumber}`);
    console.log(`📦 Status no DB: ${statusFromDB}`);
    console.log(`🌐 Broker DB: ${brokerFromDB}`);
    console.log(`🛰️ Broker recebido: ${brokerReceived}`);

    // Verifica se está liberado e se o broker corresponde
    const isLiberado = statusFromDB === "liberado" && brokerFromDB === brokerReceived;

    if (isLiberado) {
      console.log(`✅ Conta ${accountNumber} está LIBERADA`);
      return NextResponse.json({ result: "Liberado" }, { status: 200 });
    } else {
      console.log(`⛔ Conta ${accountNumber} está BLOQUEADA`);
      return NextResponse.json({ result: "Bloqueado" }, { status: 200 });
    }

  } catch (error: any) {
    console.error("🔥 Erro interno na API /validate:", error);
    return NextResponse.json({ result: "Erro", message: error.message }, { status: 500 });
  }
}