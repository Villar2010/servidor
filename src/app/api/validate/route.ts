import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// 🔹 Função auxiliar para inicializar o Firebase apenas uma vez
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      console.log("🚀 Inicializando Firebase Admin...");

      const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      if (!rawServiceAccount) {
        throw new Error("Variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON não encontrada.");
      }

      const serviceAccount = JSON.parse(rawServiceAccount);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      console.log("✅ Firebase inicializado com sucesso!");
    } catch (error: any) {
      console.error("❌ Erro CRÍTICO ao inicializar Firebase:", error.message);
      // Lança o erro para ser capturado pelo bloco catch da função GET
      throw new Error(`Falha na inicialização do Firebase: ${error.message}`);
    }
  }

  return admin;
}

export async function GET(request: Request) {
  try {
    // 🔹 Garante que o Firebase está inicializado ANTES de usar o Firestore
    const adminInstance = getFirebaseAdmin();
    const db = adminInstance.firestore();

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get("accountNumber");
    const brokerServer = searchParams.get("brokerServer");

    if (!accountNumber) {
      return NextResponse.json(
        { result: "Erro", message: "Faltando parâmetro: accountNumber" },
        { status: 400 }
      );
    }
    
    console.log(`Recebida validação para Conta: ${accountNumber}, Servidor: ${brokerServer}`);

    const docRef = db.collection("clients").doc(accountNumber);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      console.log(`🚫 Conta não encontrada na base de dados: ${accountNumber}`);
      return NextResponse.json({ result: "Bloqueado", motivo: "Conta não cadastrada" }, { status: 200 });
    }

    const data = snapshot.data() || {};
    console.log(`📄 Dados encontrados para a conta ${accountNumber}:`, data);

    const statusFromDB = (data.status || "").trim().toLowerCase();
    const brokerFromDB = (data.brokerServer || "").trim().toLowerCase();
    const brokerReceived = (brokerServer || "").trim().toLowerCase();
    
    console.log(`🔍 Comparando: [Status DB: '${statusFromDB}' vs 'liberado'], [Servidor DB: '${brokerFromDB}' vs Servidor Recebido: '${brokerReceived}']`);

    const isLiberado = statusFromDB === "liberado";
    const isServerMatch = brokerFromDB === brokerReceived;

    if (isLiberado && isServerMatch) {
      console.log(`✅ CONTA LIBERADA: ${accountNumber}`);
      return NextResponse.json({ result: "Liberado" }, { status: 200 });
    } else {
      let motivo = "";
      if (!isLiberado) motivo = `Status na base de dados é '${data.status || "N/A"}'`;
      else if (!isServerMatch) motivo = `Servidor da corretora não corresponde (Recebido: '${brokerServer}', Esperado: '${data.brokerServer}')`;
      console.log(`⛔ CONTA BLOQUEADA: ${accountNumber}. Motivo: ${motivo}`);
      return NextResponse.json({ result: "Bloqueado", motivo: motivo }, { status: 200 });
    }

  } catch (error: any) {
    console.error("🔥 Erro interno na API de validação:", error);
    return NextResponse.json(
      { result: "Erro", message: error.message || "Erro interno no servidor" },
      { status: 500 }
    );
  }
}
