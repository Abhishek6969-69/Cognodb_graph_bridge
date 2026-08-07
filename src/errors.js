export class DatabaseUnavailableError extends Error {
  constructor(message = "Graph database is unavailable") {
    super(message);
    this.name = "DatabaseUnavailableError";
    this.status = 503;
  }
}
