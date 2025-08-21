import axios from "axios";
import crypto from "crypto";

const BASE_URL = "https://api.3commas.io/public/api/ver1";

function generateSignature(queryString, secret) {
  return crypto.createHmac("sha256", secret).update(queryString).digest("hex");
}

export async function createExchange(apiKey, apiSecret, params) {
  const queryString = new URLSearchParams(params).toString();
  const signature = generateSignature(queryString, apiSecret);

  const response = await axios.post(`${BASE_URL}/accounts/new`, params, {
    headers: {
      APIKEY: apiKey,
      Signature: signature,
    },
  });

  return response.data;
}
