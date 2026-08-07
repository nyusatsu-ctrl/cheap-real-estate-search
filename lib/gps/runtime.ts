export function isGpsDemoModeEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV !== "production" && env.GPS_DEMO_MODE === "true";
}

export function isGpsDevelopmentEnvironment(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV === "development";
}

export function isGpsMockRouteAvailable(env: Record<string, string | undefined> = process.env) {
  return isGpsDevelopmentEnvironment(env) && isGpsDemoModeEnabled(env);
}
