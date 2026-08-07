import { config, hasDatabaseConfig } from "./config.js";
import { createDemoRepository } from "./demoRepository.js";
import { createGraphRepository } from "./graphRepository.js";
import { DatabaseUnavailableError } from "./errors.js";

function createUnavailableRepository() {
  const error = () => {
    throw new DatabaseUnavailableError("Missing CognoDB credentials");
  };

  return {
    mode: "offline",
    async close() {},
    async health() {
      return {
        ok: false,
        mode: "offline",
        message: "Set COGNODB_URI and COGNODB_PASSWORD, or run with USE_DEMO_DATA=true."
      };
    },
    getReferenceData: error,
    getRoleMap: error,
    getRecommendations: error,
    getGraph: error
  };
}

export function createRepository() {
  if (config.useDemoData) {
    return createDemoRepository();
  }

  if (!hasDatabaseConfig()) {
    return createUnavailableRepository();
  }

  return createGraphRepository(config.database);
}
