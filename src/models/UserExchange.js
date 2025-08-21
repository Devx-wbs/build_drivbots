import mongoose from "mongoose";

const userExchangeSchema = new mongoose.Schema(
  {
    memberstackId: { type: String, required: true },
    binanceApiKey: { type: String, required: true },
    binanceSecret: { type: String, required: true },
    threeCommasAccountId: { type: String, required: true }, // Returned from 3Commas
  },
  { timestamps: true }
);

export default mongoose.model("UserExchange", userExchangeSchema);
