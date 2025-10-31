// Este arquivo pode causar problemas se o FIREBASE_SERVICE_ACCOUNT não estiver definido.
// A estratégia foi alterada para priorizar operações no lado do cliente sempre que possível.
// As rotas de API (server-side) ainda precisarão deste arquivo e da variável de ambiente para funcionar.
'use server';
import { initializeApp, getApps, getApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

interface FirebaseAdminServices {
  app: App;
  db: Firestore;
}

let services: FirebaseAdminServices | null = null;

/**
 * Initializes the Firebase Admin SDK, reusing the existing instance if available.
 * This function is intended for server-side use only.
 */
export async function initializeFirebase(): Promise<FirebaseAdminServices> {
  if (services) {
    return services;
  }

  // Em ambientes de produção (como Vercel), a app pode já estar inicializada
  if (getApps().length > 0) {
    const app = getApp();
    const db = getFirestore(app);
    services = { app, db };
    return services;
  }
  
  // Esta variável de ambiente DEVE ser configurada na Vercel.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    console.error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT não está definida. As rotas de API que dependem do Admin SDK não funcionarão.');
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Please provide your service account key as a base64-encoded string.');
  }

  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountString, 'base64').toString('utf8'));
    
    const app = initializeApp({
      credential: cert(serviceAccount),
    });
    
    const db = getFirestore(app);

    services = { app, db };
    return services;

  } catch (e) {
    console.error('Falha ao analisar FIREBASE_SERVICE_ACCOUNT ou inicializar Firebase Admin SDK:', e);
    throw new Error('Could not initialize Firebase Admin SDK. Check server logs.');
  }
}
