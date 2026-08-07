import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getAdminLoginPath, sanitizeAdminRedirectPath } from "../lib/admin-redirect.ts";
import { createAuthorizedGpsAccess, resolveGpsAdminPrincipal } from "../lib/gps/access-policy.ts";
import {
  getGpsApiAuthError,
  parseGpsJsonObject,
  validateGpsApiMutationRequest
} from "../lib/gps/api-security.ts";
import { evaluateGpsCommand, GPS_COMMAND_ALLOWLIST, isGpsRelayControlEnabled } from "../lib/gps/command-policy.ts";
import { getGpsNavigation } from "../lib/gps/navigation.ts";
import { isGpsAdminPath } from "../lib/gps/routing.ts";
import { isGpsDemoModeEnabled, isGpsDevelopmentEnvironment, isGpsMockRouteAvailable } from "../lib/gps/runtime.ts";
import {
  buildGpsUsageSummary,
  GPS_MONTHLY_AVERAGE_LIMIT_MB,
  GPS_MONTHLY_TARGET_MB
} from "../lib/gps/usage.ts";
import {
  getGpsDeviceDuplicateError,
  validateGpsCustomerInput,
  validateGpsDeviceInput,
  validateGpsVehicleInput
} from "../lib/gps/validation.ts";
import { buildJt808Frame, parseMv930gPacket } from "../server/mv930g/parser.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("GPS画面に誤置換語が残らない", async () => {
  const sources = await readSourceFiles([
    path.join(repositoryRoot, "app/admin/gps"),
    path.join(repositoryRoot, "components/gps")
  ]);
  assert.doesNotMatch(sources, /GPS物件|GPS管理対象/);
  assert.doesNotMatch(sources, /管理対象/);
});

test("不動産サーチ側の物件表記は維持される", async () => {
  const source = await readFile(path.join(repositoryRoot, "app/properties/page.tsx"), "utf8");
  assert.match(source, /物件/);
});

test("GPS専用ナビゲーションは本番メニューと開発メニューを分離する", () => {
  const production = getGpsNavigation("production");
  assert.deepEqual(
    production.map((item) => item.label),
    ["GPSダッシュボード", "顧客", "車両", "GPS端末", "現在位置・走行履歴", "受信ログ", "解析エラー", "アラーム・操作履歴", "通信量"]
  );
  assert.ok(!production.some((item) => item.developmentOnly));
  assert.ok(getGpsNavigation("development").some((item) => item.developmentOnly));
});

test("GPS管理画面だけを共通ヘッダーとフッターから分離する", async () => {
  assert.equal(isGpsAdminPath("/admin/gps"), true);
  assert.equal(isGpsAdminPath("/admin/gps/devices"), true);
  assert.equal(isGpsAdminPath("/admin/gps-other"), false);
  assert.equal(isGpsAdminPath("/admin/diagnoses"), false);
  assert.equal(isGpsAdminPath("/properties"), false);

  const header = await readFile(path.join(repositoryRoot, "components/AppHeader.tsx"), "utf8");
  const footer = await readFile(path.join(repositoryRoot, "components/AppFooter.tsx"), "utf8");
  const layout = await readFile(path.join(repositoryRoot, "app/admin/gps/layout.tsx"), "utf8");
  assert.match(header, /if \(isGpsAdminPath\(pathname\)\) return null;/);
  assert.match(footer, /if \(isGpsAdminPath\(pathname\)\) return null;/);
  assert.match(layout, /title = "GPS車両管理システム \| 株式会社エコループ"/);
  assert.match(layout, /<GpsAdminShell email=\{admin\.email\} isDemo=\{admin\.isPreview\}>/);
});

test("GPS専用ヘッダーは添付EcoLoopロゴを比率維持で表示する", async () => {
  const shell = await readFile(path.join(repositoryRoot, "components/gps/GpsAdminShell.tsx"), "utf8");
  const logo = await readFile(path.join(repositoryRoot, "components/gps/ecoloop-mobility-logo.png"));
  assert.match(shell, /import Image from "next\/image";/);
  assert.match(shell, /import ecoLoopMobilityLogo from "\.\/ecoloop-mobility-logo\.png";/);
  assert.match(shell, /src=\{ecoLoopMobilityLogo\}/);
  assert.match(shell, /alt="株式会社エコループ"/);
  assert.match(shell, /sizes="\(min-width: 640px\) 64px, 48px"/);
  assert.match(shell, /className="size-12 shrink-0 object-contain sm:size-16"/);
  assert.match(shell, /<h1 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">GPS車両管理システム<\/h1>/);
  assert.equal(logo.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(logo.readUInt32BE(16), 1254);
  assert.equal(logo.readUInt32BE(20), 1254);
});

test("管理画面内の安全な復帰先だけを許可する", () => {
  assert.equal(sanitizeAdminRedirectPath("/admin/gps", "/admin/diagnoses"), "/admin/gps");
  assert.equal(sanitizeAdminRedirectPath("/admin/gps/devices?status=offline", "/admin/diagnoses"), "/admin/gps/devices?status=offline");
  for (const unsafe of [
    "http://example.com/admin/gps",
    "https://example.com/admin/gps",
    "//example.com/admin/gps",
    "/\\example.com/admin/gps",
    "/properties",
    "/admin/login",
    "javascript:alert(1)"
  ]) {
    assert.equal(sanitizeAdminRedirectPath(unsafe, "/admin/diagnoses"), "/admin/diagnoses");
  }
});

test("未ログインのGPSアクセスは安全なnext付きログインURLへ戻す", () => {
  assert.equal(getAdminLoginPath("/admin/gps"), "/admin/login?next=%2Fadmin%2Fgps");
  assert.equal(getAdminLoginPath("https://example.com/admin/gps"), "/admin/login");
});

test("顧客登録の入力をサーバー規則で検証する", () => {
  assert.equal(validateGpsCustomerInput({}).ok, false);
  assert.equal(
    validateGpsCustomerInput({
      full_name: "テスト顧客",
      phone: "",
      address: "",
      email: "customer@example.test",
      contract_type: "car",
      contract_status: "active",
      notes: ""
    }).ok,
    true
  );
});

test("車両登録の入力をサーバー規則で検証する", () => {
  assert.equal(
    validateGpsVehicleInput({
      customer_id: "",
      vehicle_type: "car",
      maker: "",
      model_name: "",
      model_year: "",
      vin: "",
      license_plate: "",
      status: "active"
    }).ok,
    false
  );
  assert.equal(
    validateGpsVehicleInput({
      customer_id: "",
      vehicle_type: "car",
      maker: "テストメーカー",
      model_name: "テスト車",
      model_year: "2025",
      vin: "",
      license_plate: "",
      status: "active"
    }).ok,
    true
  );
});

test("GPS端末登録は端末IDとIMEIの形式を検証する", () => {
  assert.equal(
    validateGpsDeviceInput({
      vehicle_id: "",
      device_name: "MiCODUS MV930G-G",
      imei: "not-an-imei",
      device_identifier: "x",
      sim_phone_number: "",
      iccid: "",
      connection_status: "offline"
    }).ok,
    false
  );
  assert.equal(
    validateGpsDeviceInput({
      vehicle_id: "",
      device_name: "MiCODUS MV930G-G",
      imei: "000000000000000",
      device_identifier: "DEMO_DEVICE_001",
      sim_phone_number: "",
      iccid: "",
      connection_status: "offline"
    }).ok,
    true
  );
});

test("端末ID・IMEIの重複を項目別エラーにする", () => {
  assert.deepEqual(getGpsDeviceDuplicateError(true, false), {
    message: "この管理用端末IDは既に登録されています。",
    fieldErrors: { device_identifier: "別の管理用端末IDを入力してください。" }
  });
  assert.deepEqual(getGpsDeviceDuplicateError(false, true), {
    message: "このIMEIは既に登録されています。",
    fieldErrors: { imei: "別のIMEIを入力してください。" }
  });
  assert.equal(getGpsDeviceDuplicateError(false, false), null);
});

test("DB障害時のデモモードは明示値trueだけで有効になる", () => {
  assert.equal(isGpsDemoModeEnabled({}), false);
  assert.equal(isGpsDemoModeEnabled({ GPS_DEMO_MODE: "false" }), false);
  assert.equal(isGpsDemoModeEnabled({ GPS_DEMO_MODE: "TRUE" }), false);
  assert.equal(isGpsDemoModeEnabled({ GPS_DEMO_MODE: "true" }), true);
  assert.equal(isGpsDemoModeEnabled({ NODE_ENV: "production", GPS_DEMO_MODE: "true" }), false);
  assert.equal(isGpsMockRouteAvailable({ NODE_ENV: "production", GPS_DEMO_MODE: "true" }), false);
  assert.equal(isGpsMockRouteAvailable({ NODE_ENV: "development", GPS_DEMO_MODE: "true" }), true);
});

test("モック投入と実機テスト画面はproductionで利用できない", async () => {
  assert.equal(isGpsDevelopmentEnvironment({ NODE_ENV: "production" }), false);
  assert.equal(isGpsDevelopmentEnvironment({ NODE_ENV: "development" }), true);

  const mockPage = await readFile(path.join(repositoryRoot, "app/admin/gps/mock/page.tsx"), "utf8");
  const testPage = await readFile(path.join(repositoryRoot, "app/admin/gps/test/page.tsx"), "utf8");
  assert.match(mockPage, /if \(!isGpsMockRouteAvailable\(\)\) notFound\(\);/);
  assert.match(testPage, /if \(!isGpsDevelopmentEnvironment\(\)\) notFound\(\);/);
});

test("リレー制御と端末コマンドは環境変数に関係なく拒否される", () => {
  assert.deepEqual(GPS_COMMAND_ALLOWLIST, []);
  assert.equal(isGpsRelayControlEnabled({}), false);
  assert.equal(isGpsRelayControlEnabled({ GPS_RELAY_CONTROL_ENABLED: "true" }), false);
  for (const command of ["RELAY,1#", "RELAY,2#", "safe_cut", "restore", "STATUS#"]) {
    assert.equal(evaluateGpsCommand(command).allowed, false);
  }
});

test("MV930G最小パーサーは認証・heartbeat・位置情報を識別する", () => {
  const terminalId = `${"0".repeat(11)}1`;
  const locationBody = Buffer.alloc(28);
  locationBody.writeUInt32BE(3, 4);
  locationBody.writeUInt32BE(12_345_678, 8);
  locationBody.writeUInt32BE(98_765_432, 12);
  encodeBcd("260806120000").copy(locationBody, 22);
  const authentication = parseMv930gPacket(buildJt808Frame({
    messageId: 0x0102,
    terminalId,
    serialNumber: 1,
    body: Buffer.from("synthetic-auth", "ascii")
  }));
  const heartbeat = parseMv930gPacket(buildJt808Frame({ messageId: 0x0002, terminalId, serialNumber: 2 }));
  const location = parseMv930gPacket(buildJt808Frame({
    messageId: 0x0200,
    terminalId,
    serialNumber: 3,
    body: locationBody
  }));
  assert.equal(authentication.packetType, "terminal_authentication");
  assert.equal(heartbeat.packetType, "heartbeat");
  assert.equal(location.packetType, "location_report");
  assert.equal(location.position?.latitude, 12.345678);
  assert.equal(location.position?.longitude, 98.765432);
});

test("通信量未取得時は架空値を生成しない", () => {
  const unknown = buildGpsUsageSummary({ currentMonthMb: null, totalMb: null, observedMonths: null });
  assert.equal(unknown.currentMonthMb, null);
  assert.equal(unknown.totalMb, null);
  assert.equal(unknown.fiveYearProjectionMb, null);
  assert.equal(unknown.warning, "unavailable");
  assert.equal(GPS_MONTHLY_TARGET_MB, 6.5);
  assert.equal(GPS_MONTHLY_AVERAGE_LIMIT_MB, 8.33);
});

test("未ログイン・非管理者ではGPS DB clientを生成しない", () => {
  let clientCalls = 0;
  const createClient = () => {
    clientCalls += 1;
    return { kind: "service-role-client" };
  };

  const unauthenticated = createAuthorizedGpsAccess(
    resolveGpsAdminPrincipal({ status: "unauthenticated" }),
    false,
    createClient
  );
  const forbidden = createAuthorizedGpsAccess(
    resolveGpsAdminPrincipal({ status: "forbidden" }),
    false,
    createClient
  );

  assert.equal(unauthenticated.status, "unauthenticated");
  assert.equal(forbidden.status, "forbidden");
  assert.equal(clientCalls, 0);
});

test("管理者だけがservice-role処理へ進み、デモではclientを生成しない", () => {
  let clientCalls = 0;
  const principal = resolveGpsAdminPrincipal({
    status: "authorized",
    admin: { id: "admin-test-id", email: "admin@example.test" }
  });
  const databaseAccess = createAuthorizedGpsAccess(principal, false, () => {
    clientCalls += 1;
    return { kind: "service-role-client" };
  });
  assert.equal(databaseAccess.status, "authorized");
  assert.equal(databaseAccess.mode, "database");
  assert.equal(clientCalls, 1);

  const demoAccess = createAuthorizedGpsAccess(principal, true, () => {
    clientCalls += 1;
    return { kind: "must-not-run" };
  });
  assert.equal(demoAccess.status, "authorized");
  assert.equal(demoAccess.mode, "demo");
  assert.equal(clientCalls, 1);
});

test("GPS APIは未ログイン401・非管理者403を区別する", () => {
  assert.deepEqual(getGpsApiAuthError("unauthenticated"), {
    status: 401,
    message: "管理者ログインが必要です。"
  });
  assert.deepEqual(getGpsApiAuthError("forbidden"), {
    status: 403,
    message: "GPS管理者権限がありません。"
  });
});

test("GPS変更APIは同一OriginとJSONだけを許可する", async () => {
  const valid = new Request("https://admin.example.test/api/admin/gps/gps_devices", {
    method: "POST",
    headers: {
      Origin: "https://admin.example.test",
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin"
    },
    body: "{}"
  });
  assert.equal(validateGpsApiMutationRequest(valid), null);
  assert.deepEqual(await parseGpsJsonObject(valid), { ok: true, data: {} });

  const external = new Request("https://admin.example.test/api/admin/gps/gps_devices", {
    method: "POST",
    headers: {
      Origin: "https://evil.example.test",
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "cross-site"
    },
    body: "{}"
  });
  assert.equal(validateGpsApiMutationRequest(external)?.status, 403);

  const wrongContentType = new Request("https://admin.example.test/api/admin/gps/gps_devices", {
    method: "POST",
    headers: { Origin: "https://admin.example.test", "Content-Type": "text/plain" },
    body: "{}"
  });
  assert.equal(validateGpsApiMutationRequest(wrongContentType)?.status, 415);

  const malformed = new Request("https://admin.example.test/api/admin/gps/gps_devices", {
    method: "POST",
    headers: { Origin: "https://admin.example.test", "Content-Type": "application/json" },
    body: "{"
  });
  assert.equal((await parseGpsJsonObject(malformed)).ok, false);
});

test("device_command_queueはGPS一般APIの対象外", async () => {
  const resources = await readFile(path.join(repositoryRoot, "lib/gps/resources.ts"), "utf8");
  const resourceNameUnion = resources.match(/export type GpsResourceName =([\s\S]*?);/)?.[1] ?? "";
  assert.doesNotMatch(resourceNameUnion, /device_command_queue/);
});

test("GPS service-role実装はserver-onlyでクライアント境界から隔離される", async () => {
  const serviceClient = await readFile(path.join(repositoryRoot, "lib/gps/server-admin-client.ts"), "utf8");
  const serverAuth = await readFile(path.join(repositoryRoot, "lib/gps/server-auth.ts"), "utf8");
  const gpsApiSources = await readSourceFiles([path.join(repositoryRoot, "app/api/admin/gps")]);
  const gpsAdminSources = await readSourceFiles([path.join(repositoryRoot, "app/admin/gps")]);
  const clientSources = await readClientComponentSources([
    path.join(repositoryRoot, "app/admin/gps"),
    path.join(repositoryRoot, "components/gps")
  ]);

  assert.match(serviceClient, /^import "server-only";/);
  assert.match(serverAuth, /^import "server-only";/);
  assert.match(serviceClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(serviceClient, /persistSession:\s*false/);
  assert.match(serviceClient, /autoRefreshToken:\s*false/);
  assert.match(serviceClient, /detectSessionInUrl:\s*false/);
  assert.match(serviceClient, /GpsAdminClientConfigurationError/);
  const forbiddenPublicServiceRoleName = ["NEXT", "PUBLIC", "SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");
  assert.ok(
    !(serviceClient + serverAuth + gpsApiSources + gpsAdminSources).includes(forbiddenPublicServiceRoleName)
  );
  assert.doesNotMatch(clientSources, /server-admin-client|server-auth|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(gpsApiSources + gpsAdminSources, /createSupabaseServerClient/);
});

test("GPS APIとServer Actionsは認証後だけservice-role clientを取得する", async () => {
  const apiSources = await readSourceFiles([path.join(repositoryRoot, "app/api/admin/gps")]);
  const actions = await readFile(path.join(repositoryRoot, "app/admin/gps/actions.ts"), "utf8");
  const data = await readFile(path.join(repositoryRoot, "lib/gps/data.ts"), "utf8");

  assert.match(apiSources, /await authorizeGpsApiRequest\(\)/);
  assert.match(apiSources, /getGpsAdminAccessForPrincipal\(authorization\.principal\)/);
  assert.match(actions, /const admin = await requireAdmin\(nextPath\);[\s\S]*createGpsAdminServiceRoleClient\(\)/);
  assert.match(data, /await requireAdmin\("\/admin\/gps"\);[\s\S]*createGpsAdminServiceRoleClient\(\)/);
});

test("GPS APIレスポンスとログはDB詳細や秘密値を直接返さない", async () => {
  const sources = await readSourceFiles([
    path.join(repositoryRoot, "app/api/admin/gps"),
    path.join(repositoryRoot, "lib/gps")
  ]);
  assert.doesNotMatch(sources, /Response\.json\(\s*\{[^}]*serviceRole/i);
  assert.doesNotMatch(sources, /console\.(?:error|warn|info|log)\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(sources, /message:\s*(?<!\.)error\.message/);
});

async function readSourceFiles(roots: string[]) {
  const files: string[] = [];
  for (const root of roots) await collectSourceFiles(root, files);
  return (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
}

async function collectSourceFiles(directory: string, files: string[]) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectSourceFiles(target, files);
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(target);
  }
}

async function readClientComponentSources(roots: string[]) {
  const files: string[] = [];
  for (const root of roots) await collectSourceFiles(root, files);
  const contents = await Promise.all(files.map(async (file) => ({ file, source: await readFile(file, "utf8") })));
  return contents
    .filter(({ source }) => /^\s*["']use client["'];/m.test(source))
    .map(({ file, source }) => `// ${file}\n${source}`)
    .join("\n");
}

function encodeBcd(value: string) {
  const output = Buffer.alloc(value.length / 2);
  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number(value[index * 2]) * 16 + Number(value[index * 2 + 1]);
  }
  return output;
}
