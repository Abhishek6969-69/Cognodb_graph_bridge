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

// Simple health check for the DB
app.get("/api/health", async (req, res, next) => {
  try {
    res.json(await repository.health());
  } catch (error) {
    next(error);
  }
});

// Fetches all available roles and skills for the dropdowns
app.get("/api/reference", async (req, res, next) => {
  try {
    res.json(await repository.getReferenceData());
  } catch (error) {
    next(error);
  }
});

app.get("/api/role-map", async (req, res, next) => {
  try {
    // console.log("Fetching role map...");
    res.json({ roles: await repository.getRoleMap() });
  } catch (error) {
    next(error);
  }
});

// Main logic: calculates missing skills and finds bridge paths (courses/mentors)
app.get("/api/recommendations", async (req, res, next) => {
  try {
    const targetRoleId = req.query.targetRoleId;
    if (!targetRoleId) {
      res.status(400).json({ error: "targetRoleId is required" });
      return;
    }

    res.json(
      await repository.getRecommendations({
        targetRoleId,
        currentSkillIds: parseSkills(req.query.currentSkills)
      })
    );
  } catch (error) {
    // TODO: better error logging here
    next(error);
  }
});

// Returns the D3/SVG compatible graph nodes and links
app.get("/api/graph", async (req, res, next) => {
  try {
    const targetRoleId = req.query.targetRoleId;
    if (!targetRoleId) {
      // FIXME: standardize error responses across API
      res.status(400).json({ error: "targetRoleId is required" });
      return;
    }

    res.json(
      await repository.getGraph({
        targetRoleId,
        currentSkillIds: parseSkills(req.query.currentSkills)
      })
    );
  } catch (error) {
    next(error);
  }
});

// Global error handler
app.use((error, req, res, next) => {
  if (error instanceof DatabaseUnavailableError) {
    res.status(error.status).json({
      error: "Database unreachable",
      message: "Check COGNODB_URI, COGNODB_USER, and COGNODB_PASSWORD, then verify the CognoDB instance is running."
    });
    return;
  }

  console.error(error);
  res.status(500).json({ error: "Unexpected server error" });
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
