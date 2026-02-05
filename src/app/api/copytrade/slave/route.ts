import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

function getFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountString) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON not set.");
      const serviceAccount = JSON.parse(serviceAccountString);
      const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: privateKey,
        }),
      });
    } catch (error: any) {
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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const adminInstance = getFirebaseAdmin();
    const db = adminInstance.firestore();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const account = searchParams.get("account");

    if (!action || !account) {
      return NextResponse.json({ error: "Missing params" }, { status: 400, headers: corsHeaders });
    }

    if (action === "check_license") {
      const licenseRef = db.collection('copytrade_licenses').doc(account);
      const licenseDoc = await licenseRef.get();

      if (!licenseDoc.exists) {
        return NextResponse.json({ status: "blocked", reason: "license_not_found" }, { status: 200, headers: corsHeaders });
      }

      const licenseData = licenseDoc.data();
      if (!licenseData || !licenseData.active) {
        return NextResponse.json({ status: "blocked", reason: "inactive_license" }, { status: 200, headers: corsHeaders });
      }

      const masterId = licenseData.master_id;
      const activeSlavesQuery = await db.collection('copytrade_licenses')
        .where('master_id', '==', masterId)
        .where('active', '==', true)
        .get();
        
      const masterDoc = await db.collection('copytrade_masters').doc(masterId).get();
      const masterData = masterDoc.data();
      const maxSlaves = masterDoc.exists && masterData ? (masterData.max_slaves || 10) : 10;

      if (activeSlavesQuery.size > maxSlaves) {
        return NextResponse.json({ status: "blocked", reason: "master_limit_reached" }, { status: 200, headers: corsHeaders });
      }

      await licenseRef.update({ last_check: new Date().toISOString() });

      return NextResponse.json({
        status: "active",
        master_id: masterId,
        risk_divider: licenseData.risk_divider || 30000
      }, { status: 200, headers: corsHeaders });
    }

    if (action === "get_orders") {
      const licenseDoc = await db.collection('copytrade_licenses').doc(account).get();
      const licenseData = licenseDoc.data();

      if (!licenseDoc.exists || !licenseData?.active) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403, headers: corsHeaders });
      }

      const masterId = licenseData.master_id;
      const ordersRef = db.collection('copytrade_masters').doc(masterId).collection('orders');
      const openOrdersQuery = await ordersRef.where('status', '==', 'OPEN').get();

      const orders: any[] = [];
      openOrdersQuery.forEach(doc => {
        orders.push(doc.data());
      });

      return NextResponse.json({ orders }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400, headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}