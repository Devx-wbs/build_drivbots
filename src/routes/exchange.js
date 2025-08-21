import express from "express";
import UserExchange from "../models/UserExchange.js";
import { createExchange } from "../config/threecommas.js";

const router = express.Router();

router.post("/connect-binance", async (req, res) => {
  try {
    const { memberstackId, binanceApiKey, binanceSecret } = req.body;
    if (!memberstackId || !binanceApiKey || !binanceSecret) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Call 3Commas API
    const params = {
      type: "binance",
      name: `User-${memberstackId}`,
      api_key: binanceApiKey,
      secret: binanceSecret,
      is_paper: false,
    };

    const response = await createExchange(
      process.env.THREE_COMMAS_API_KEY,
      process.env.THREE_COMMAS_SECRET,
      params
    );

    // Save mapping in Mongo
    const exchange = await UserExchange.create({
      memberstackId,
      binanceApiKey,
      binanceSecret,
      threeCommasAccountId: response.id,
    });

    res.json({ success: true, account: exchange });
  } catch (err) {
    console.error(
      "Error connecting Binance:",
      err.response?.data || err.message
    );
    res.status(500).json({ error: "Failed to connect exchange" });
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
