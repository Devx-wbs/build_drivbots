import express from "express";
import UserExchange from "../models/UserExchange.js";
import { createBinanceAccount, listAccounts } from "../config/threecommas.js";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

// Helper to sign Binance API requests (from your working code)
const signQuery = (query, secret) =>
  crypto.createHmac("sha256", secret).update(query).digest("hex");

// Helper to validate Binance API keys
async function validateBinanceKeys(apiKey, apiSecret) {
  const timestamp = Date.now();
  const query = `timestamp=${timestamp}`;
  const signature = signQuery(query, apiSecret);

  await axios.get(
    `https://api.binance.com/api/v3/account?${query}&signature=${signature}`,
    { headers: { "X-MBX-APIKEY": apiKey } }
  );
}

router.post("/connect-binance", async (req, res) => {
  try {
    const { memberstackId, binanceApiKey, binanceSecret } = req.body;
    if (!memberstackId || !binanceApiKey || !binanceSecret) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // First, validate the Binance API keys directly (like your old working code)
    console.log("Validating Binance API keys directly...");
    await validateBinanceKeys(binanceApiKey, binanceSecret);
    console.log("✅ Binance API keys are valid!");

    // Now try to connect to 3Commas with updated flow
    console.log("Attempting to connect to 3Commas (new flow)...");
    const response = await createBinanceAccount({
      binanceApiKey,
      binanceApiSecret: binanceSecret,
      name: `User-${memberstackId}`,
    });

    // Prefer id/account_id from response, otherwise fallback to lookup
    let threeCommasId = response?.id || response?.account_id;
    if (threeCommasId === undefined || threeCommasId === null) {
      const accounts = await listAccounts();
      const matched = accounts.find(
        (a) =>
          a?.name === `User-${memberstackId}` &&
          (a?.type === "binance" || a?.type === "binance_spot")
      );
      if (!matched) {
        return res.status(400).json({
          error: "3Commas did not return an account id and lookup failed",
          details: response,
        });
      }
      threeCommasId = matched.id || matched.account_id;
    }

    // Save mapping in Mongo
    const exchange = await UserExchange.create({
      memberstackId,
      binanceApiKey,
      binanceSecret,
      threeCommasAccountId: threeCommasId,
    });

    res.json({ success: true, account: exchange });
  } catch (err) {
    console.error(
      "Error connecting Binance:",
      err.response?.data || err.message
    );

    // Provide more specific error messages
    if (err.response?.data?.error === "record_invalid") {
      res.status(400).json({
        error:
          "3Commas cannot connect to your Binance account. Please check: 1) IP whitelist includes 3Commas servers, 2) API key has 'Enable Spot & Margin Trading' permission, 3) Account is not restricted.",
      });
    } else if (
      err.message?.includes &&
      err.message.includes("Request failed with status code 401")
    ) {
      res.status(400).json({ error: "Invalid Binance API key or secret" });
    } else {
      res.status(500).json({ error: "Failed to connect exchange" });
    }
  }
});

router.get("/my-exchanges/:memberstackId", async (req, res) => {
  try {
    const exchanges = await UserExchange.find({
      memberstackId: req.params.memberstackId,
    });
    res.json(exchanges);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch exchanges" });
  }
});

export default router;
