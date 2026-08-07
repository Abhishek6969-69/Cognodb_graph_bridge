import { config, hasDatabaseConfig } from "./config.js";
import { createDemoRepository } from "./demoRepository.js";
import { createGraphRepository } from "./graphRepository.js";

export function createRepository() {
  if (config.useDemoData || !hasDatabaseConfig()) {
    return createDemoRepository();
  }

  return createGraphRepository(config.database);
}
