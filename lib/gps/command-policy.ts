export const GPS_COMMAND_ALLOWLIST: readonly string[] = Object.freeze([]);

const RELAY_COMMAND_PATTERN = /\bRELAY\s*,\s*[12]\s*#/i;
const RELAY_OPERATION_NAMES = new Set(["safe_cut", "restore", "relay_cut", "relay_restore"]);

export function isGpsRelayControlEnabled(_env: Record<string, string | undefined> = process.env) {
  // Phase 1 is deliberately hard-disabled even if an environment value is changed.
  void _env;
  return false;
}

export function evaluateGpsCommand(command: unknown) {
  const normalized = String(command ?? "").trim();
  const isRelayCommand = RELAY_COMMAND_PATTERN.test(normalized) || RELAY_OPERATION_NAMES.has(normalized.toLowerCase());

  return {
    allowed: false as const,
    isRelayCommand,
    reason: isRelayCommand
      ? "リレー制御は安全方針により無効です。"
      : "GPS端末へのコマンド送信は有効化されていません。"
  };
}
