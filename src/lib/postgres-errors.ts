export function hasPostgresCode(error: unknown, expectedCode: string): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current !== "object") return false;
    if ("code" in current && current.code === expectedCode) return true;
    current = "cause" in current ? current.cause : null;
  }
  return false;
}
