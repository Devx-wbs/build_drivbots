import axios from "axios";
import crypto from "crypto";

function sanitizeEnv(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function buildFormBody(params) {
  const entries = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );
  return entries.join("&");
}

function signRequest(path, bodyString, secret) {
  const stringToSign =
    bodyString && bodyString.length > 0 ? `${path}?${bodyString}` : path;
  return crypto.createHmac("sha256", secret).update(stringToSign).digest("hex");
}

export async function createBinanceAccount({
  binanceApiKey,
  binanceApiSecret,
  name,
}) {
  const apiKey = sanitizeEnv(process.env.THREE_COMMAS_API_KEY);
  const apiSecret = sanitizeEnv(process.env.THREE_COMMAS_API_SECRET);

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Missing THREE_COMMAS_API_KEY or THREE_COMMAS_API_SECRET in environment"
    );
  }

  const baseUrl =
    sanitizeEnv(process.env.THREE_COMMAS_BASE_URL) || "https://api.3commas.io";
  const path = "/public/api/ver1/accounts/new";

  const payload = {
    type: "binance",
    name: name || "New account",
    api_key: binanceApiKey,
    secret: binanceApiSecret,
    "types_to_create[]": "binance",
  };

  const bodyString = buildFormBody(payload);
  const signature = signRequest(path, bodyString, apiSecret);

  const headers = {
    APIKEY: apiKey,
    Signature: signature,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "3c-direct-test/1.0",
  };

  const url = `${baseUrl}${path}`;

  if (process.env.DEBUG_3C === "true") {
    const safeHeaders = {
      ...headers,
      APIKEY: apiKey ? `len:${apiKey.length}` : undefined,
      Signature: signature ? `len:${signature.length}` : undefined,
    };
    console.log("3C Request:", {
      url,
      path,
      headerKeys: Object.keys(headers),
      headers: safeHeaders,
    });
  }

  const response = await axios.post(url, bodyString, {
    headers,
    validateStatus: () => true,
  });

  if (process.env.DEBUG_3C === "true") {
    console.log("3C Response:", {
      status: response.status,
      data: response.data,
    });
  }

  if (response.status >= 400) {
    const err = new Error(`3Commas error ${response.status}`);
    err.response = response;
    throw err;
  }

  if (process.env.DEBUG_3C === "true") {
    console.log("3C Success Response:", {
      status: response.status,
      data: response.data,
      hasAccountId: Boolean(response.data?.id || response.data?.account_id),
    });
  }

  if (!response.data?.id && !response.data?.account_id) {
    throw new Error("3Commas did not return an account id and lookup failed");
  }

  return response.data;
}

export async function listAccounts(params = {}) {
  const apiKey = sanitizeEnv(process.env.THREE_COMMAS_API_KEY);
  const apiSecret = sanitizeEnv(process.env.THREE_COMMAS_API_SECRET);

  if (!apiKey || !apiSecret) {
    throw new Error(
      "Missing THREE_COMMAS_API_KEY or THREE_COMMAS_API_SECRET in environment"
    );
  }

  const baseUrl =
    sanitizeEnv(process.env.THREE_COMMAS_BASE_URL) || "https://api.3commas.io";
  const path = "/public/api/ver1/accounts";

  const queryString = buildFormBody(params || {});
  const signature = signRequest(path, queryString, apiSecret);

  const headers = {
    APIKEY: apiKey,
    Signature: signature,
    "User-Agent": "3c-direct-test/1.0",
  };

  const url = `${baseUrl}${path}${queryString ? `?${queryString}` : ""}`;

  if (process.env.DEBUG_3C === "true") {
    const safeHeaders = {
      ...headers,
      APIKEY: apiKey ? `len:${apiKey.length}` : undefined,
      Signature: signature ? `len:${signature.length}` : undefined,
    };
    console.log("3C List Accounts Request:", {
      url,
      path,
      headerKeys: Object.keys(headers),
      headers: safeHeaders,
    });
  }

  const response = await axios.get(url, {
    headers,
    validateStatus: () => true,
  });

  if (process.env.DEBUG_3C === "true") {
    console.log("3C List Accounts Response:", {
      status: response.status,
      data: response.data,
    });
  }

  if (response.status >= 400) {
    const err = new Error(`3Commas error ${response.status}`);
    err.response = response;
    throw err;
  }

  return response.data;
}

export function _debugBuild({ binanceApiKey, binanceApiSecret, name }) {
  const apiKey = sanitizeEnv(process.env.THREE_COMMAS_API_KEY);
  const apiSecret = sanitizeEnv(process.env.THREE_COMMAS_API_SECRET);
  const baseUrl =
    sanitizeEnv(process.env.THREE_COMMAS_BASE_URL) || "https://api.3commas.io";
  const path = "/public/api/ver1/accounts/new";

  const payload = {
    type: "binance",
    name: name || "New account",
    api_key: binanceApiKey,
    secret: binanceApiSecret,
    "types_to_create[]": "binance",
  };

  const bodyString = buildFormBody(payload);
  const signature = signRequest(path, bodyString, apiSecret || "");
  const headers = {
    APIKEY: apiKey,
    Signature: signature,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "3c-direct-test/1.0",
  };

  return {
    url: `${baseUrl}${path}`,
    path,
    payload,
    sortedKeys: Object.keys(payload).sort(),
    bodyString,
    signature,
    headerKeys: Object.keys(headers),
    headerLens: {
      APIKEY: headers.APIKEY ? headers.APIKEY.length : 0,
      Signature: headers.Signature ? headers.Signature.length : 0,
    },
  };
}
