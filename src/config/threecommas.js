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
    console.log("3Commas JSON Response status:", responseJson.status);
    console.log("3Commas JSON Response data:", responseJson.data);
    const jsonData = responseJson.data;
    if (!jsonData || responseJson.status === 204) {
      throw new Error("Empty JSON create response (204)");
    }
    const detectedId =
      jsonData?.id ||
      jsonData?.account_id ||
      jsonData?.data?.id ||
      jsonData?.data?.account_id;
    return { id: detectedId, raw: jsonData };
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
  console.log("3Commas FORM Response status:", responseForm.status);
  console.log("3Commas FORM Response data:", responseForm.data);
  const formData = responseForm.data;
  const detectedId =
    formData?.id ||
    formData?.account_id ||
    formData?.data?.id ||
    formData?.data?.account_id;
  return { id: detectedId, raw: formData };
}

// List all connected accounts (JSON ver1 API). Returns array.
export async function listAccounts(apiKey, apiSecret) {
  // Attempt 1: JSON ver1
  try {
    const path = "/ver1/accounts";
    const messageToSign = path; // GET with no params
    const signature = generateSignature(messageToSign, apiSecret);

    const resp = await axios.get(`${BASE_URL_JSON}/accounts`, {
      headers: {
        APIKEY: apiKey,
        Signature: signature,
      },
    });

    console.log("3Commas LIST JSON status:", resp.status);
    if (resp.status !== 204 && resp.data) {
      return Array.isArray(resp.data) ? resp.data : [];
    }
    throw new Error(`Empty list (status ${resp.status})`);
  } catch (e) {
    console.warn(
      "3Commas LIST JSON failed, trying public API...",
      e.response?.data || e.message
    );
  }

  // Attempt 2: public API
  const publicPath = "/public/api/ver1/accounts";
  const publicSignature = generateSignature(publicPath, apiSecret);
  const publicResp = await axios.get(`${BASE_URL_FORM}/accounts`, {
    headers: {
      APIKEY: apiKey,
      Signature: publicSignature,
    },
  });
  console.log("3Commas LIST PUBLIC status:", publicResp.status);
  const arr = Array.isArray(publicResp.data) ? publicResp.data : [];
  try {
    console.log(
      "3Commas LIST PUBLIC sample:",
      arr.slice(0, 5).map((a) => ({
        id: a?.id,
        name: a?.name,
        type: a?.type || a?.market_code || a?.market,
        exchange: a?.exchange_name || a?.market_title,
      }))
    );
  } catch (_) {}
  return arr;
}
