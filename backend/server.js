import "dotenv/config";
import cors from "cors";
import express from "express";
import aiRoutes from "./routes/aiRoutes.js";
import ingredientRoutes from "./routes/ingredientRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import imageRoutes from "./routes/imageRoutes.js";

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/", (_req, res) =>
  res.json({
    service: "SmartChefAI API",
    health: "/health",
    apiBase: "/api",
  })
);
app.get("/health", (_req, res) => res.json({ status: "ok", service: "SmartChefAI API" }));
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/recipes", recipeRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/images", imageRoutes);

const server = app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`SmartChefAI backend running on port ${port}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(`Port ${port} is already in use. Stop the existing SmartChefAI backend process and try again.`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.error("SmartChefAI backend failed to start:", error);
  process.exit(1);
});

function shutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down SmartChefAI backend...`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
