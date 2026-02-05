import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

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
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
 * API endpoint for Slave EAs.
 * action=check_license: Validates the slave's license.
 * action=get_orders: Fetches open orders from the linked master.
 */
export async function GET(request: Request) {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    const { searchParams } = new URL(request.url);

    const action = searchParams.get("action");
    const account = searchParams.get("account");

    if (!action || !account) {
      return NextResponse.json({ error: "Missing 'action' or 'account' parameter" }, { status: 400, headers: corsHeaders });
    }

    // --- Action: Check License ---
    if (action === "check_license") {
        // CORRECTED Path to license document
        const licenseRef = db.collection('copytrade_licenses').doc(account);
        const licenseDoc = await licenseRef.get();

        if (!licenseDoc.exists()) {
            return NextResponse.json({ status: "blocked", reason: "license_not_found" }, { status: 200, headers: corsHeaders });
        }

        const licenseData = licenseDoc.data()!;
        if (!licenseData.active) {
            return NextResponse.json({ status: "blocked", reason: "inactive_license" }, { status: 200, headers: corsHeaders });
        }
        
        // Business Rule: Check if master has hit the slave limit
        const masterId = licenseData.master_id;
        
        // CORRECTED Query on the licenses collection
        const licensesCollectionRef = db.collection('copytrade_licenses');
        const activeSlavesQuery = await licensesCollectionRef.where('master_id', '==', masterId).where('active', '==', true).get();
        
        // CORRECTED Path to master document
        const masterRef = db.collection('copytrade_masters').doc(masterId);
        const masterDoc = await masterRef.get();
        
        const maxSlaves = masterDoc.exists() ? (masterDoc.data()!.max_slaves || 10) : 10;
        
        if (activeSlavesQuery.size > maxSlaves) {
             return NextResponse.json({ status: "blocked", reason: "master_limit_reached" }, { status: 200, headers: corsHeaders });
        }

        // Update last_check timestamp
        await licenseRef.update({ last_check: new Date().toISOString() });

        return NextResponse.json({ 
            status: "active", 
            master_id: licenseData.master_id,
            risk_divider: licenseData.risk_divider || 0
        }, { status: 200, headers: corsHeaders });
    }

    // --- Action: Get Orders ---
    if (action === "get_orders") {
        // CORRECTED Path to license document
        const licenseRef = db.collection('copytrade_licenses').doc(account);
        const licenseDoc = await licenseRef.get();

        if (!licenseDoc.exists() || !licenseDoc.data()!.active) {
            return NextResponse.json({ error: "Unauthorized: Inactive or non-existent license." }, { status: 403, headers: corsHeaders });
        }

        const masterId = licenseDoc.data()!.master_id;
        // CORRECTED Path to orders subcollection
        const ordersRef = db.collection('copytrade_masters').doc(masterId).collection('orders');
        const openOrdersQuery = await ordersRef.where('status', '==', 'OPEN').get();
        
        const orders: any[] = [];
        openOrdersQuery.forEach(doc => {
            orders.push(doc.data());
        });

        return NextResponse.json({ orders: orders }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json({ error: "Invalid action specified" }, { status: 400, headers: corsHeaders });

  } catch (error: any) {
    console.error("Error in Slave API endpoint:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
