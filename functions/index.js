const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Evita a reinicialização em cada invocação
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Cloud Function para validar a licença de um cliente MT5.
 * Endpoint: /api/validate (via rewrite no firebase.json)
 * @param {functions.https.Request} req - O objeto de requisição.
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
  
  // Extrai os parâmetros tanto de query (GET) como de body (POST)
  const { accountNumber, brokerServer } = req.method === 'POST' ? req.body : req.query;

  if (!accountNumber || !brokerServer) {
    console.log("Parâmetros ausentes:", { accountNumber, brokerServer });
    // Retorna texto simples para compatibilidade com MT5
    return res.status(400).send("Bloqueado");
  }

  try {
    const clientRef = db.collection("clients").doc(String(accountNumber));
    const docSnap = await clientRef.get();

    let resultText = 'Bloqueado'; // Padrão de segurança

    if (docSnap.exists) {
      const client = docSnap.data();
      
      const brokerServerFromDB = client.brokerServer?.trim().toLowerCase() || '';
      const normalizedBrokerServerFromRequest = String(brokerServer).trim().toLowerCase();

      // Compara o status e os servidores normalizados
      if (client.status === 'Liberado' && brokerServerFromDB === normalizedBrokerServerFromRequest) {
        resultText = 'Liberado';
      }
    } else {
        // Log se o cliente não for encontrado no banco de dados
        console.log(`Cliente não encontrado com o accountNumber: ${accountNumber}`);
    }
    
    // Retorna o resultado como texto simples
    res.status(200).send(resultText);

  } catch (error) {
    console.error(`Erro na validação para accountNumber ${accountNumber}:`, error);
    // Em caso de erro interno no servidor, retorna 'Bloqueado' por segurança
    res.status(500).send("Bloqueado");
  }
});
