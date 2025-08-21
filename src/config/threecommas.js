import axios from "axios";
import crypto from "crypto";

const BASE_URL = "https://api.3commas.io/public/api/ver1";

function buildFormBody(parameters) {
  const entries = Object.entries(parameters)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB));

  const form = new URLSearchParams();
  for (const [key, value] of entries) {
    form.append(key, String(value));
  }
  return form.toString();
}

function generateSignature(message, secret) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

export async function createExchange(apiKey, apiSecret, params) {
  const body = buildFormBody(params);
  const signature = generateSignature(body, apiSecret);

  const response = await axios.post(`${BASE_URL}/accounts/new`, body, {
    headers: {
      APIKEY: apiKey,
      Signature: signature,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}
