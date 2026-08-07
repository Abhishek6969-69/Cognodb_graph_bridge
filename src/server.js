import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { DatabaseUnavailableError } from "./errors.js";
import { createRepository } from "./repositoryFactory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const repository = createRepository();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function parseSkills(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

app.get("/api/health", async (_request, response, next) => {
  try {
    response.json(await repository.health());
  } catch (error) {
    next(error);
  }
});

app.get("/api/reference", async (_request, response, next) => {
  try {
    response.json(await repository.getReferenceData());
  } catch (error) {
    next(error);
  }
});

app.get("/api/role-map", async (_request, response, next) => {
  try {
    response.json({ roles: await repository.getRoleMap() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/recommendations", async (request, response, next) => {
  try {
    const targetRoleId = request.query.targetRoleId;
    if (!targetRoleId) {
      response.status(400).json({ error: "targetRoleId is required" });
      return;
    }

    response.json(
      await repository.getRecommendations({
        targetRoleId,
        currentSkillIds: parseSkills(request.query.currentSkills)
      })
    );
  } catch (error) {
    next(error);
  }
});

app.get("/api/graph", async (request, response, next) => {
  try {
    const targetRoleId = request.query.targetRoleId;
    if (!targetRoleId) {
      response.status(400).json({ error: "targetRoleId is required" });
      return;
    }

    response.json(
      await repository.getGraph({
        targetRoleId,
        currentSkillIds: parseSkills(request.query.currentSkills)
      })
    );
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof DatabaseUnavailableError) {
    response.status(error.status).json({
      error: "Database unreachable",
      message: "Check COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD, then verify the CognoDB instance is running."
    });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Unexpected server error" });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`SkillBridge Graph running on http://${config.host}:${config.port}`);
  console.log(`Data mode: ${repository.mode}`);
});

async function shutdown() {
  await repository.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
