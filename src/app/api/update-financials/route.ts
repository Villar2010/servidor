// src/app/api/update-financials/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Esquema de validação para os dados financeiros recebidos
const FinancialDataSchema = z.object({
  accountNumber: z.string(),
  balanceGross: z.number().optional(),
  balanceNet: z.number().optional(),
  openTradesCount: z.number().optional(),
  openTradesProfit: z.number().optional(),
  totalInBRL: z.number().optional(),
});

// Guarda a instância inicializada para reutilização
let adminApp: App;

/**
 * Inicializa o Firebase Admin SDK de forma idempotente e robusta.
 */
function initializeAdminApp() {
    if (getApps().length) {
        return getApp();
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
    }

    try {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
        return initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error('Falha ao inicializar Firebase Admin SDK:', e);
        throw new Error('Não foi possível inicializar o Firebase Admin SDK.');
    }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar os dados recebidos
    const validationResult = FinancialDataSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json({
        success: false,
        error: "Dados inválidos.",
        details: validationResult.error.flatten(),
      }, { status: 400 });
    }
    
    const financialData = validationResult.data;
    
    // Garante que o app admin está inicializado
    adminApp = initializeAdminApp();
    const db = getFirestore(adminApp);
    
    const clientRef = db.collection('clientes').doc(financialData.accountNumber);

    const docSnap = await clientRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({
        success: false,
        error: `Cliente com conta ${financialData.accountNumber} não encontrado.`,
      }, { status: 404 });
    }

    // Mescla os dados financeiros com os dados existentes
    const dataToUpdate = {
      ...financialData,
      lastUpdate: new Date().toISOString(),
    };
    
    // Usando `set` com `merge: true` do Admin SDK, que é equivalente ao `setDoc` com merge do client SDK.
    await clientRef.set(dataToUpdate, { merge: true });

    return NextResponse.json({
      success: true,
      message: `Dados financeiros da conta ${financialData.accountNumber} atualizados com sucesso.`,
    });

  } catch (error) {
    console.error('API /update-financials Error:', error);
    const errorMessage = error instanceof Error ? error.message : "Ocorreu um erro interno no servidor.";
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
