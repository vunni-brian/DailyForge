export function nowIso() {
  return new Date().toISOString()
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`
}
