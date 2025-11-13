export const brand = "mark↓";

export function log(message: string) {
  process.stdout.write(`[${brand}] ${message}\n`);
}

export function logError(message: string) {
  process.stderr.write(`[${brand}] ${message}\n`);
}
