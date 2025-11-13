export const brand = "mark↓";

export type LogLevel = "info" | "warn" | "error";

export interface LogFields {
  message?: string;
  [key: string]: unknown;
}

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}) {
  const entry = {
    brand,
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields
  };
  const output = `${JSON.stringify(entry)}\n`;
  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(output);
}

export function log(message: string, fields?: LogFields) {
  if (fields) {
    logEvent("info", message, fields);
    return;
  }
  logEvent("info", "message", { message });
}

export function logError(message: string, fields?: LogFields) {
  if (fields) {
    logEvent("error", message, fields);
    return;
  }
  logEvent("error", "message", { message });
}
