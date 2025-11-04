// src/app/api/validate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Client } from '@/lib/types';

// Guarda a instância inicializada para reutilização
let adminApp: App;

/**
 * Inicializa o Firebase Admin SDK de forma idempotente e robusta.
 */
function initializeAdminApp() {
    if (getApps().length) {
        console.log('[API /validate] Reutilizando instância existente do Firebase Admin SDK.');
        return getApp();
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        console.error('[API /validate] ERRO CRÍTICO: A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
    }

    try {
        const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
        console.log('[API /validate] Inicializando uma nova instância do Firebase Admin SDK.');
        return initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error('[API /validate] Falha ao analisar FIREBASE_SERVICE_ACCOUNT ou inicializar Firebase Admin SDK:', e);
        throw new Error('Não foi possível inicializar o Firebase Admin SDK.');
    }
}

/**
 * Lida com requisições GET para validação de clientes.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    console.log(`[INÍCIO] [GET] /api/validate - Recebida requisição.`);

    try {
        const { searchParams } = new URL(request.url);
        const accountNumber = searchParams.get('accountNumber');
        const brokerServerFromRequest = searchParams.get('brokerServer');

        console.log(`[PARAMETROS] accountNumber=${accountNumber}, brokerServer=${brokerServerFromRequest}`);

        if (!accountNumber || !brokerServerFromRequest) {
            console.warn(`[AVISO] Parâmetros obrigatórios ausentes. Retornando 'Bloqueado'.`);
            // Retorna texto simples para manter a compatibilidade com o sistema externo.
            return new NextResponse('Bloqueado', {
                status: 400,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }

        // Garante que o app admin está inicializado
        adminApp = initializeAdminApp();
        const db = getFirestore(adminApp);

        console.log(`[FIRESTORE] A procurar na coleção 'clients' pelo documento com ID: ${accountNumber}`);
        const clientRef = db.collection('clients').doc(accountNumber);
        const docSnap = await clientRef.get();

        let resultText: 'Liberado' | 'Bloqueado';
        let reason: string;

        if (docSnap.exists) {
            const client = docSnap.data() as Client;
            console.log(`[DADOS] Cliente ${accountNumber} encontrado. Dados do DB:`, client);

            // Normalização robusta para comparação
            const brokerServerFromDB = client.brokerServer?.trim().toLowerCase() ?? '';
            const normalizedBrokerServerFromRequest = brokerServerFromRequest.trim().toLowerCase();
            
            console.log(`[COMPARAÇÃO] Servidor DB (normalizado): '${brokerServerFromDB}'`);
            console.log(`[COMPARAÇÃO] Servidor Request (normalizado): '${normalizedBrokerServerFromRequest}'`);
            
            if (client.status === 'Liberado') {
                if (brokerServerFromDB === normalizedBrokerServerFromRequest) {
                    resultText = 'Liberado';
                    reason = 'Cliente encontrado, status Liberado e servidor correspondente.';
                } else {
                    resultText = 'Bloqueado';
                    reason = 'O servidor da corretora não corresponde ao registado.';
                }
            } else {
                resultText = 'Bloqueado';
                reason = `Cliente encontrado, mas o status é '${client.status}'.`;
            }
        } else {
            resultText = 'Bloqueado';
            reason = 'Cliente não encontrado na base de dados.';
        }

        console.log(`[FIM] Resultado para ${accountNumber}: ${resultText}. Motivo: ${reason}`);
        // Retorna o texto simples para manter a compatibilidade com o sistema externo.
        return new NextResponse(resultText, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error(`[ERRO INTERNO] Erro interno do servidor:`, error);
        // Em caso de erro, retorna 'Bloqueado' por segurança
        return new NextResponse('Bloqueado', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

// O método POST é mantido para compatibilidade, mas o GET é o padrão para este tipo de validação.
export async function POST(request: NextRequest): Promise<Response> {
    console.log(`[INÍCIO] [POST] /api/validate - Recebida requisição POST.`);
    
    // Extrai dados do corpo e constrói uma URL com searchParams para reutilizar a lógica GET
    try {
        const body = await request.json();
        const { accountNumber, brokerServer } = body;
        console.log(`[POST-PARAMETROS] accountNumber=${accountNumber}, brokerServer=${brokerServer}`);

        if (!accountNumber || !brokerServer) {
            console.warn(`[POST-AVISO] Corpo da requisição POST deve conter accountNumber e brokerServer. Retornando 'Bloqueado'.`);
            return new NextResponse('Bloqueado', {
                status: 400,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        
        // Simula uma requisição GET para reutilizar a lógica principal
        const simulatedUrl = new URL(request.url);
        simulatedUrl.searchParams.set('accountNumber', String(accountNumber));
        simulatedUrl.searchParams.set('brokerServer', String(brokerServer));

        const simulatedRequest = new NextRequest(simulatedUrl, request);

        console.log('[POST] A redirecionar para a lógica GET...');
        return GET(simulatedRequest);

    } catch (e) {
        console.error(`[POST-ERRO] Erro ao analisar corpo da requisição:`, e);
        return new NextResponse('Bloqueado', {
            status: 400,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}
