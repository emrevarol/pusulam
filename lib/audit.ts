// Structured audit logging for security-relevant actions
// In production, replace console with a logging service (Axiom, Datadog, etc.)

type AuditAction =
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGIN_FAILED"
  | "AUTH_REGISTER"
  | "AUTH_LOCKOUT"
  | "TRADE_BUY"
  | "TRADE_SELL"
  | "MARKET_CREATED"
  | "MARKET_RESOLVED"
  | "MARKET_HALTED"
  | "ADMIN_SUGGESTION_APPROVED"
  | "ADMIN_SUGGESTION_REJECTED"
  | "PROFILE_UPDATED"
  | "CRON_SYNC_PRICES"
  | "CRON_RESOLVE"
  | "CRON_CLOSE";

interface AuditEntry {
  action: AuditAction;
  userId?: string;
  ip?: string;
  details?: Record<string, unknown>;
}

export function audit(entry: AuditEntry) {
  const log = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // Structured JSON log — picked up by Vercel logs, Axiom, etc.
  console.log(`[AUDIT] ${JSON.stringify(log)}`);
}
