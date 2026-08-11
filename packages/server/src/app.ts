import express from "express";
import cors from "cors";
import helmet from "helmet";
import { checkDatabaseConnection } from "./config/db.js";
import { errorHandler, notFoundHandler } from "./middleware/handler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await checkDatabaseConnection();
    res.json({ status: "ok", db: "connected", timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected", timestamp: new Date().toISOString() });
  }
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
