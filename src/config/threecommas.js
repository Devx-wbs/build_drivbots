import axios from "axios";
import crypto from "crypto";

const BASE_URL = "https://api.3commas.io/public/api/ver1";
const ACCOUNTS_NEW_PATH = "/public/api/ver1/accounts/new";

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
  // Per 3Commas HMAC docs: sign PATH + '?' + sorted-query
  const messageToSign = `${ACCOUNTS_NEW_PATH}?${body}`;
  const signature = generateSignature(messageToSign, apiSecret);

  console.log("3Commas Request Debug:");
  console.log("URL:", `${BASE_URL}/accounts/new`);
  console.log("Body:", body);
  console.log("Message to sign:", messageToSign);
  console.log("Signature:", signature);
  console.log("API Key (first 10 chars):", apiKey.substring(0, 10) + "...");

  const response = await axios.post(`${BASE_URL}/accounts/new`, body, {
    headers: {
      APIKEY: apiKey,
      Signature: signature,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  return response.data;
}
