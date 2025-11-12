import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// 🔹 Função auxiliar para inicializar o Firebase apenas uma vez
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      console.log("🚀 Inicializando Firebase Admin...");

      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      if (!raw) throw new Error("Variável FIREBASE_SERVICE_ACCOUNT_JSON ausente!");

      const serviceAccount = JSON.parse(raw);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✅ Firebase inicializado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao inicializar Firebase:", error);
      throw error;
    }
  }

  return admin;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get("accountNumber");
    const brokerServer = searchParams.get("brokerServer");

    if (!accountNumber) {
      return NextResponse.json(
        { result: "Erro", message: "Faltando parâmetro: accountNumber" },
        { status: 400 }
      );
    }

    // 🔹 Garante que o Firebase está inicializado ANTES de usar o Firestore
    const adminInstance = getFirebaseAdmin();
    const db = adminInstance.firestore();

    const snapshot = await db.collection("clientes").doc(accountNumber).get();

    if (!snapshot.exists) {
      console.log(`🚫 Conta não encontrada: ${accountNumber}`);
      return NextResponse.json({ result: "Bloqueado", motivo: "Conta não cadastrada" });
    }

    const data = snapshot.data() || {};

    const statusFromDB = (data.status || "").trim().toLowerCase();
    const brokerFromDB = (data.brokerServer || "").trim().toLowerCase();
    const brokerReceived = (brokerServer || "").trim().toLowerCase();

    console.log(`🔍 Conta: ${accountNumber}`);
    console.log(`📦 Status: ${statusFromDB}`);
    console.log(`🌐 Broker DB: ${brokerFromDB}`);
    console.log(`🛰️ Broker recebido: ${brokerReceived}`);

    const isLiberado =
      statusFromDB === "liberado" && brokerFromDB === brokerReceived;

    if (isLiberado) {
      console.log(`✅ Conta ${accountNumber} está LIBERADA`);
      return NextResponse.json({ result: "Liberado" }, { status: 200 });
    } else {
      console.log(`⛔ Conta ${accountNumber} está BLOQUEADA`);
      return NextResponse.json({ result: "Bloqueado" }, { status: 200 });
    }
  } catch (error: any) {
    console.error("🔥 Erro interno:", error);
    return NextResponse.json(
      { result: "Erro", message: error.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}