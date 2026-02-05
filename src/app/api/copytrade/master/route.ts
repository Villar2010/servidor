import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { MasterApiSchema } from "@/lib/copytrade-types";

// Helper function to initialize Firebase Admin SDK safely
function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountString) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON environment variable not set.");
      }
      const serviceAccount = JSON.parse(serviceAccountString);
      // Restore newlines in private key
      const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      const credential = { ...serviceAccount, private_key: privateKey };
      
      admin.initializeApp({
        credential: admin.credential.cert(credential),
      });
    } catch (error: any) {
      console.error("CRITICAL Error initializing Firebase Admin:", error.message);
      throw new Error(`Firebase Admin initialization failed: ${error.message}`);
    }
  }
  return admin;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight requests
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * API endpoint for the Master EA to send order data.
 * It creates, updates, or closes an order in Firestore.
 */
export async function POST(request: Request) {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();

    const body = await request.json();

    // Validate input against Zod schema
    const validation = MasterApiSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid input data", details: validation.error.flatten() }, { status: 400, headers: corsHeaders });
    }

    const { master_id, order } = validation.data;
    const { ticket_master, ...orderDetails } = order;

    // Path to the order document
    const orderRef = db.collection('copytrade_masters').doc(master_id).collection('orders').doc(ticket_master);

    const dataToSave = {
      ...orderDetails,
      ticket_master: ticket_master, // ensure ticket is in the document
      updated_at: new Date().toISOString(),
    };

    // Use set with merge to create or update the document
    await orderRef.set(dataToSave, { merge: true });

    // Ensure the master document exists, creating it only if necessary
    const masterRef = db.collection('copytrade_masters').doc(master_id);
    const masterDoc = await masterRef.get();

    if (!masterDoc.exists()) {
        await masterRef.set({ 
            status: 'ativo', 
            max_slaves: 10,
            created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true, message: `Order ${ticket_master} for master ${master_id} processed.` }, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error("Error in Master API endpoint:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
