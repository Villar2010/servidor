// src/app/api/update-financials/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { initializeFirebase } from '@/firebase/server';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Esquema de validação para os dados financeiros recebidos
const FinancialDataSchema = z.object({
  accountNumber: z.string(),
  balanceGross: z.number().optional(),
  balanceNet: z.number().optional(),
  openTradesCount: z.number().optional(),
  openTradesProfit: z.number().optional(),
  totalInBRL: z.number().optional(),
});

async function getDb() {
  const { db } = await initializeFirebase();
  return db;
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
    const db = await getDb();
    const clientRef = doc(db, 'clients', financialData.accountNumber);

    const docSnap = await getDoc(clientRef);

    if (!docSnap.exists()) {
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
    
    await setDoc(clientRef, dataToUpdate, { merge: true });

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
