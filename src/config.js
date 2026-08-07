import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "127.0.0.1",
  database: {
    uri: process.env.COGNODB_URI,
    user: process.env.COGNODB_USER || "cognodb",
    password: process.env.COGNODB_PASSWORD
  },
  useDemoData: process.env.USE_DEMO_DATA === "true"
};

export function hasDatabaseConfig() {
  return Boolean(config.database.uri && config.database.password);
}
