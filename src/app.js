import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import exchangeRoutes from "./routes/exchange.js";

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use("/api/exchange", exchangeRoutes);

export default app;
