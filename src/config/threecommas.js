import axios from "axios";
import crypto from "crypto";

// Prefer JSON ver1 API first; fallback to public form API
const BASE_URL_JSON = "https://api.3commas.io/ver1";
const ACCOUNTS_NEW_PATH_JSON = "/ver1/accounts/new";
const BASE_URL_FORM = "https://api.3commas.io/public/api/ver1";
const ACCOUNTS_NEW_PATH_FORM = "/public/api/ver1/accounts/new";

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
  // Attempt 1: JSON body at /ver1, sign PATH + JSON string
  try {
    const jsonBody = JSON.stringify(params);
    const messageToSignJson = `${ACCOUNTS_NEW_PATH_JSON}${jsonBody}`;
    const signatureJson = generateSignature(messageToSignJson, apiSecret);

    console.log("3Commas JSON Attempt:");
    console.log("URL:", `${BASE_URL_JSON}/accounts/new`);
    console.log("Body:", jsonBody);
    console.log("Message to sign:", messageToSignJson);
    console.log("Signature:", signatureJson);

    const responseJson = await axios.post(
      `${BASE_URL_JSON}/accounts/new`,
      params,
      {
        headers: {
          APIKEY: apiKey,
          Signature: signatureJson,
          "Content-Type": "application/json",
        },
      }
    );

    return responseJson.data;
  } catch (err) {
    console.warn(
      "3Commas JSON attempt failed, trying form-encoded public API...",
      err.response?.data || err.message
    );
  }

  // Attempt 2: public form API, sign PATH + '?' + sorted query
  const formBody = buildFormBody(params);
  const messageToSignForm = `${ACCOUNTS_NEW_PATH_FORM}?${formBody}`;
  const signatureForm = generateSignature(messageToSignForm, apiSecret);

  console.log("3Commas FORM Attempt:");
  console.log("URL:", `${BASE_URL_FORM}/accounts/new`);
  console.log("Body:", formBody);
  console.log("Message to sign:", messageToSignForm);
  console.log("Signature:", signatureForm);

  const responseForm = await axios.post(
    `${BASE_URL_FORM}/accounts/new`,
    formBody,
    {
      headers: {
        APIKEY: apiKey,
        Signature: signatureForm,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return responseForm.data;
}
