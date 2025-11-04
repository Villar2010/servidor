const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

admin.initializeApp();

const db = admin.firestore();
const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));

app.get("/validate", async (req, res) => {
  try {
    const { accountNumber, brokerServer } = req.query;

    if (!accountNumber || !brokerServer) {
      console.log("[VALIDATION FAIL] Missing parameters:", {
        accountNumber,
        brokerServer,
      });
      return res.status(400).send("Bloqueado");
    }

    console.log(
      `[VALIDATION START] Received request for Account: ${accountNumber}, Server: ${brokerServer}`
    );

    const clientRef = db.collection("clients").doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = "Bloqueado"; // Security default

    if (docSnap.exists) {
      const client = docSnap.data();
      console.log(`[VALIDATION INFO] Found document for ${accountNumber}:`, client);

      if (client) {
        const brokerServerFromDB = client.brokerServer || "";
        const statusFromDB = client.status || "Bloqueado";

        const normalizedBrokerServerFromDB = brokerServerFromDB.trim();
        const normalizedBrokerServerFromRequest = String(brokerServer).trim();
        
        console.log(`[VALIDATION COMPARE] Status from DB: '${statusFromDB}'`);
        console.log(`[VALIDATION COMPARE] Broker from DB (normalized): '${normalizedBrokerServerFromDB}'`);
        console.log(`[VALIDATION COMPARE] Broker from Request (normalized): '${normalizedBrokerServerFromRequest}'`);

        const areServersEqual =
          normalizedBrokerServerFromDB.localeCompare(
            normalizedBrokerServerFromRequest,
            undefined, // Use default locale
            { sensitivity: "base", ignorePunctuation: true }
          ) === 0;
          
        console.log(`[VALIDATION CHECK] Are servers equal (robust compare): ${areServersEqual}`);

        if (statusFromDB === "Liberado" && areServersEqual) {
          resultText = "Liberado";
          console.log(`[VALIDATION SUCCESS] Match for ${accountNumber}. Status: Liberado.`);
        } else {
          console.log(`[VALIDATION FAIL] No match for ${accountNumber}. Status check: ${statusFromDB === "Liberado"}. Server check: ${areServersEqual}.`);
        }
      }
    } else {
      console.log(
        `[VALIDATION FAIL] Client not found with accountNumber: ${accountNumber}`
      );
    }

    console.log(`[VALIDATION END] Final result for ${accountNumber}: ${resultText}`);
    // Respond with plain text as expected by MT5
    return res.status(200).send(resultText);
  } catch (error) {
    console.error("Error in validateClient function:", error);
    // Respond with plain text as expected by MT5
    return res.status(500).send("Bloqueado");
  }
});


// Expose Express API as a single Cloud Function
exports.api = functions.https.onRequest(app);
