
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// A inicialização do admin SDK deve acontecer apenas uma vez.
admin.initializeApp();
const db = admin.firestore();

const app = express();

// Aplica o middleware CORS a todas as rotas
app.use(cors({ origin: true }));

// O Firebase Hosting remove o prefixo "/api" ao reescrever.
// A aplicação Express deve responder ao caminho restante.
app.get("/validate", async (req, res) => {
  try {
    const { accountNumber, brokerServer } = req.query;

    if (!accountNumber || !brokerServer) {
      console.log("[VALIDATION FAIL] Missing parameters:", {
        accountNumber,
        brokerServer,
      });
      // Retorna texto plano como esperado pelo MT5
      return res.status(400).send("Bloqueado");
    }

    console.log(
      `[VALIDATION START] Received request for Account: ${accountNumber}, Server: ${brokerServer}`
    );

    // Usa a coleção "clients"
    const clientRef = db.collection("clients").doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = "Bloqueado"; // Padrão de segurança

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

        // Usando localeCompare para uma comparação de strings mais robusta
        const areServersEqual =
          normalizedBrokerServerFromDB.localeCompare(
            normalizedBrokerServerFromRequest,
            undefined, 
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
    // Responde com texto plano como esperado pelo MT5
    return res.status(200).send(resultText);
  } catch (error) {
    console.error("Error in validateClient function:", error);
    // Responde com texto plano como esperado pelo MT5
    return res.status(500).send("Bloqueado");
  }
});

// Exporta a aplicação Express como uma única Cloud Function chamada "api"
exports.api = functions.https.onRequest(app);
