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
      
      const serviceAccountParsed = JSON.parse(rawServiceAccount);

      // ✨ CORREÇÃO: Restaura as quebras de linha na chave privada.
      const privateKey = serviceAccountParsed.private_key.replace(/\\n/g, '\n');
      
      const credential = {
        ...serviceAccountParsed,
        private_key: privateKey,
      }

      admin.initializeApp({
        credential: admin.credential.cert(credential),
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'text/plain',
};

// Lida com preflight requests do CORS
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  try {
    const adminInstance = getFirebaseAdmin();
    const db = adminInstance.firestore();

    const { searchParams } = new URL(request.url);
    const accountNumber = searchParams.get("accountNumber");
    const brokerServer = searchParams.get("brokerServer");

    if (!accountNumber) {
      return new Response("Erro: Faltando parâmetro: accountNumber", { status: 400, headers: corsHeaders });
    }
    
    console.log(`Recebida validação para Conta: ${accountNumber}, Servidor: ${brokerServer}`);

    const docRef = db.collection("clients").doc(accountNumber);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      console.log(`🚫 Conta não encontrada na base de dados: ${accountNumber}`);
      return new Response("Bloqueado", { status: 200, headers: corsHeaders });
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
      return new Response("Liberado", { status: 200, headers: corsHeaders });
    } else {
      let motivo = "";
      if (!isLiberado) motivo = `Status na base de dados é '${data.status || "N/A"}'`;
      else if (!isServerMatch) motivo = `Servidor da corretora não corresponde (Recebido: '${brokerServer}', Esperado: '${data.brokerServer}')`;
      console.log(`⛔ CONTA BLOQUEADA: ${accountNumber}. Motivo: ${motivo}`);
      return new Response("Bloqueado", { status: 200, headers: corsHeaders });
    }

  } catch (error: any) {
    console.error("🔥 Erro interno na API de validação:", error);
    return new Response(`Erro: ${error.message || "Erro interno no servidor"}`, { status: 500, headers: corsHeaders });
  }
}
