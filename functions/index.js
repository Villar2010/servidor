const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Evita a reinicialização em cada invocação
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function para validar a licença de um cliente MT5.
 * Endpoint: /validateClient
 * @param {functions.https.Request} req - O objeto de requisição, esperando 'accountNumber' e 'brokerServer' nos query params.
 * @param {functions.Response} res - O objeto de resposta.
 */
exports.validateClient = functions.https.onRequest(async (req, res) => {
  // Define os cabeçalhos CORS para permitir requisições de qualquer origem
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Responde a requisições OPTIONS para pre-flight checks do CORS
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  
  // A lógica principal é agora acionada por GET ou POST
  const { accountNumber, brokerServer } = req.method === 'POST' ? req.body : req.query;

  if (!accountNumber || !brokerServer) {
    console.log("Parâmetros ausentes:", { accountNumber, brokerServer });
    return res.status(400).send("Bloqueado");
  }

  try {
    const clientRef = db.collection("clients").doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = 'Bloqueado';

    if (docSnap.exists) {
      const client = docSnap.data();
      
      const brokerServerFromDB = client.brokerServer?.trim().toLowerCase() || '';
      const normalizedBrokerServerFromRequest = String(brokerServer).trim().toLowerCase();

      if (client.status === 'Liberado' && brokerServerFromDB === normalizedBrokerServerFromRequest) {
        resultText = 'Liberado';
      }
    } else {
        console.log(`Cliente não encontrado: ${accountNumber}`);
    }
    
    // Retorna texto simples para compatibilidade com o sistema MT5
    res.status(200).send(resultText);

  } catch (error) {
    console.error("Erro na validação:", error);
    // Retorna 'Bloqueado' por segurança em caso de erro interno
    res.status(500).send("Bloqueado");
  }
});
