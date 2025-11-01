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
        return getApp();
    }

    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        console.error('[API /validate] Erro: A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida.');
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
    console.log(`[GET] /api/validate - Recebida requisição.`);

    try {
        const { searchParams } = new URL(request.url);
        const accountNumber = searchParams.get('accountNumber');
        const brokerServer = searchParams.get('brokerServer');

        console.log(`[GET] /api/validate - Parâmetros: accountNumber=${accountNumber}, brokerServer=${brokerServer}`);

        if (!accountNumber || !brokerServer) {
            console.warn(`[GET] /api/validate - Parâmetros obrigatórios ausentes.`);
            return new Response('Error: Os parâmetros accountNumber e brokerServer são obrigatórios.', {
                status: 400,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }

        // Garante que o app admin está inicializado
        adminApp = initializeAdminApp();
        const db = getFirestore(adminApp);

        const clientRef = db.collection('clientes').doc(accountNumber);
        const docSnap = await clientRef.get();

        let resultText: 'Liberado' | 'Bloqueado';
        let reason: string;

        if (docSnap.exists) {
            const client = docSnap.data() as Client;
            console.log(`[GET] /api/validate - Cliente ${accountNumber} encontrado. Dados:`, client);

            // Normaliza as strings para comparação robusta
            const brokerServerFromDB = client.brokerServer?.trim().toLowerCase() ?? '';
            const brokerServerFromRequest = brokerServer.trim().toLowerCase();
            
            console.log(`[GET] /api/validate - Comparando servidores: DB='${brokerServerFromDB}' vs Request='${brokerServerFromRequest}'`);
            
            if (client.status === 'Liberado') {
                if (brokerServerFromDB === brokerServerFromRequest) {
                    resultText = 'Liberado';
                    reason = 'Cliente encontrado, com status liberado e servidor correspondente.';
                } else {
                    resultText = 'Bloqueado';
                    reason = 'O servidor da corretora não corresponde ao registrado.';
                }
            } else {
                resultText = 'Bloqueado';
                reason = `Cliente encontrado, mas o status é '${client.status}'.`;
            }
        } else {
            resultText = 'Bloqueado';
            reason = 'Cliente não encontrado na base de dados.';
        }

        console.log(`[GET] /api/validate - Resultado para ${accountNumber}: ${resultText}. Motivo: ${reason}`);
        // Retorna o texto simples para manter a compatibilidade com o sistema externo.
        return new Response(resultText, {
            status: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error(`[GET] /api/validate - Erro interno do servidor:`, error);
        // Em caso de erro, retorna 'Bloqueado' por segurança
        return new Response('Bloqueado', {
            status: 500,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

// O método POST é mantido para compatibilidade, mas o GET é o padrão para este tipo de validação.
export async function POST(request: NextRequest): Promise<Response> {
    console.log(`[POST] /api/validate - Recebida requisição POST, redirecionando para lógica GET.`);
    
    // Extrai dados do corpo e constrói uma URL com searchParams para reutilizar a lógica GET
    try {
        const body = await request.json();
        const { accountNumber, brokerServer } = body;

        if (!accountNumber || !brokerServer) {
            return new Response('Error: Corpo da requisição POST deve conter accountNumber e brokerServer.', {
                status: 400,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            });
        }
        
        // Simula uma requisição GET para reutilizar a lógica principal
        const simulatedUrl = new URL(request.url);
        simulatedUrl.searchParams.set('accountNumber', accountNumber);
        simulatedUrl.searchParams.set('brokerServer', brokerServer);

        const simulatedRequest = new NextRequest(simulatedUrl, request);

        return GET(simulatedRequest);

    } catch (e) {
        console.error(`[POST] /api/validate - Erro ao analisar corpo da requisição:`, e);
        return new Response('Error: Corpo da requisição POST inválido ou ausente.', {
            status: 400,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}
