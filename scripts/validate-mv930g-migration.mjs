import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migrationName = "202607290034_create_mv930g_gps_schema.sql";
const migrationPath = resolve(repositoryRoot, "supabase", "migrations", migrationName);
const jt808MigrationName = "202608060001_add_mv930g_jt808_ingest.sql";
const jt808MigrationPath = resolve(repositoryRoot, "supabase", "migrations", jt808MigrationName);
const noncePrivilegeMigrationName = "202608070001_restrict_gps_ingest_nonce_privileges.sql";
const noncePrivilegeMigrationPath = resolve(
  repositoryRoot,
  "supabase",
  "migrations",
  noncePrivilegeMigrationName
);
const nonceRpcMigrationName = "202608070002_reserve_gps_ingest_nonce_rpc.sql";
const nonceRpcMigrationPath = resolve(
  repositoryRoot,
  "supabase",
  "migrations",
  nonceRpcMigrationName
);
const preflightPath = resolve(repositoryRoot, "supabase", "verify-mv930g-gps-preflight.sql");
const verificationPath = resolve(repositoryRoot, "supabase", "verify-mv930g-gps-schema.sql");
const designPath = resolve(repositoryRoot, "docs", "mv930g-mvp-design.md");
const runbookPath = resolve(repositoryRoot, "docs", "mv930g", "mvp-runbook.md");

const migration = readFileSync(migrationPath, "utf8");
const jt808Migration = readFileSync(jt808MigrationPath, "utf8");
const noncePrivilegeMigration = readFileSync(noncePrivilegeMigrationPath, "utf8");
const nonceRpcMigration = readFileSync(nonceRpcMigrationPath, "utf8");
const preflight = readFileSync(preflightPath, "utf8");
const verification = readFileSync(verificationPath, "utf8");
const design = readFileSync(designPath, "utf8");
const runbook = readFileSync(runbookPath, "utf8");
const commandPolicy = readFileSync(resolve(repositoryRoot, "lib", "gps", "command-policy.ts"), "utf8");
const ingestSecurity = readFileSync(resolve(repositoryRoot, "lib", "gps", "ingest-security.ts"), "utf8");
const ingestRoute = readFileSync(resolve(repositoryRoot, "app", "api", "gps", "ingest", "route.ts"), "utf8");
const sql = stripSqlComments(migration);
const noncePrivilegeSql = stripSqlComments(noncePrivilegeMigration);
const nonceRpcSql = stripSqlComments(nonceRpcMigration);

assert.equal(
  createHash("sha256").update(jt808Migration).digest("hex"),
  "76111cab2e179466d70ab6a1e5b5598b9a4f07e2fe3b91871156644d6184fcbd",
  `${jt808MigrationName} must not change while adding the privilege correction.`
);
assert.equal(
  createHash("sha256").update(noncePrivilegeMigration).digest("hex"),
  "46d2ea9f8140f25a93fa5c26cef199dae9048588b9691ec41417ba5d15f9c9ab",
  `${noncePrivilegeMigrationName} must not change while adding the nonce RPC.`
);
assertNoncePrivilegeMigration(noncePrivilegeSql);
assertNonceRpcMigration(nonceRpcSql);
assert.match(ingestSecurity, /\.rpc\("mv930g_reserve_ingest_nonce"/);
assert.doesNotMatch(
  `${ingestSecurity}\n${ingestRoute}`,
  /\.from\(["']gps_ingest_nonces["']\)/,
  "Application code must not access the nonce table directly."
);
assert.match(
  commandPolicy,
  /GPS_COMMAND_ALLOWLIST[^=]*= Object\.freeze\(\[\]\)/,
  "The GPS device-command allowlist must remain empty."
);

const expectedTables = [
  "device_command_queue",
  "gps_customers",
  "gps_devices",
  "gps_positions",
  "gps_vehicles",
  "operation_logs",
  "protocol_parse_errors",
  "raw_device_logs"
];
const actualTables = [...sql.matchAll(/\bcreate\s+table\s+public\.([a-z0-9_]+)/gi)]
  .map((match) => match[1])
  .sort();

assert.deepEqual(actualTables, expectedTables, "Migration must create exactly the eight GPS tables.");
assert.match(sql, /\bcreate\s+view\s+public\.gps_latest_positions\b/i);
assert.doesNotMatch(sql, /\bcreate\s+(?:table|view)\s+if\s+not\s+exists\b/i);
assert.doesNotMatch(sql, /\bcreate\s+or\s+replace\b/i);
assert.match(sql, /^\s*begin\s*;/im);
assert.match(sql, /^\s*commit\s*;/im);
assert.match(sql, /MV930G GPS migration aborted because owned object names already exist/i);
assert.match(sql, /to_regprocedure\('public\.mv930g_gps_set_updated_at\(\)'\)/i);

for (const forbidden of [
  /^\s*(?:insert|update|delete|upsert|truncate)\b/im,
  /\bdrop\s+(?:table|view|schema)\b/i,
  /\bon\s+delete\s+cascade\b/i,
  /\bgrant\b[\s\S]*?\bon\s+all\b/i,
  /\bgrant\b[\s\S]*?\bto\s+(?:anon|authenticated)\b/i,
  /\balter\s+(?:role|schema)\b/i,
  /\bcreate\s+policy\b/i,
  /\bsecurity\s+definer\b/i
]) {
  assert.doesNotMatch(sql, forbidden);
}

const rlsEnabledTables = [...sql.matchAll(/\balter\s+table\s+public\.([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi)]
  .map((match) => match[1])
  .sort();
const rlsForcedTables = [...sql.matchAll(/\balter\s+table\s+public\.([a-z0-9_]+)\s+force\s+row\s+level\s+security/gi)]
  .map((match) => match[1])
  .sort();
assert.deepEqual(rlsEnabledTables, expectedTables);
assert.deepEqual(rlsForcedTables, expectedTables);

assert.match(
  sql,
  /revoke\s+all\s+on\s+table[\s\S]*from\s+public,\s*anon,\s*authenticated,\s*service_role\s*;/i
);
assert.match(sql, /grant\s+select,\s*insert,\s*update\s+on\s+table[\s\S]*to\s+service_role\s*;/i);
assert.doesNotMatch(sql, /grant\s+delete\b/i);
assert.match(
  sql,
  /revoke\s+all\s+on\s+table\s+public\.gps_latest_positions\s+from\s+public,\s*anon,\s*authenticated,\s*service_role\s*;/i
);
assert.match(
  sql,
  /revoke\s+all\s+on\s+function\s+public\.mv930g_gps_set_updated_at\(\)\s+from\s+public,\s*anon,\s*authenticated,\s*service_role\s*;/i
);
assert.match(sql, /security_invoker\s*=\s*true/i);
assert.match(sql, /security_barrier\s*=\s*true/i);
assert.match(sql, /order\s+by\s+p\.device_id,\s*p\.received_at\s+desc,\s*p\.created_at\s+desc,\s*p\.id\s+desc/i);

assert.match(sql, /device_command_queue_command_type_check[\s\S]*command_type\s+in\s*\('arm',\s*'disarm'\)/i);
assert.match(sql, /device_command_queue_phase1_disabled_check[\s\S]*status\s*=\s*'cancelled'/i);
assert.match(sql, /device_command_queue_phase1_disabled_check[\s\S]*attempts\s*=\s*0/i);
assert.match(sql, /device_command_queue_phase1_disabled_check[\s\S]*command_hex\s+is\s+null/i);
assert.match(sql, /RELAY\[\[:space:\]\]\*,\[\[:space:\]\]\*\[12\]/i);
assert.match(sql, /safe_cut\|restore/i);
assert.match(
  sql,
  /operation_logs_phase1_disabled_check[\s\S]*operation_type\s+in\s*\('safe_cut',\s*'restore',\s*'arm',\s*'disarm'\)[\s\S]*result_status\s*=\s*'cancelled'/i
);
assert.match(
  sql,
  /operation_logs_phase1_disabled_check[\s\S]*'customer_create'[\s\S]*'vehicle_update'[\s\S]*'device_deactivate'[\s\S]*result_status\s+in\s*\('queued',\s*'acknowledged',\s*'failed'\)/i
);

assertReadOnlyVerification(preflight, "preflight");
assertReadOnlyVerification(verification, "post-application verification");
assert.match(preflight, /public_non_gps_schema_fingerprint/);
assert.match(verification, /public_non_gps_schema_fingerprint/);
assert.match(verification, /has_table_privilege/);
assert.match(verification, /permission_ok/);
assert.match(verification, /relrowsecurity/);
assert.match(verification, /pg_get_constraintdef/);
assert.match(verification, /pg_get_indexdef/);
assert.match(verification, /mv930g_reserve_ingest_nonce\(text\)/);
assert.match(verification, /service_role_execute_allowed/);
assert.match(verification, /fixed_search_path_ok/);
assert.match(
  verification,
  /gps_ingest_nonces[\s\S]*not\s+pg_catalog\.has_table_privilege\([\s\S]*service_role/,
  "Post-application verification must reject direct service-role nonce-table privileges."
);

for (const document of [design, runbook]) {
  assert.match(document, new RegExp(escapeRegExp(migrationName)));
  assert.match(document, /service-role/i);
  assert.match(document, /ロールバック/);
}

const scopedFiles = [
  migration,
  jt808Migration,
  noncePrivilegeMigration,
  nonceRpcMigration,
  preflight,
  verification,
  design,
  runbook,
  commandPolicy
].join("\n");
assert.doesNotMatch(scopedFiles, /eyJ[A-Za-z0-9_-]{20,}/);
assert.doesNotMatch(scopedFiles, /sb_(?:secret|publishable|service_role)_[A-Za-z0-9_-]{10,}/i);
assert.doesNotMatch(scopedFiles, /SUPABASE_SERVICE_ROLE_KEY[ \t]*=[ \t]*[^\s#]+/);

console.log("MV930G migration static validation: PASS");
console.log(`tables=${expectedTables.length} views=1 rls_enabled=${rlsEnabledTables.length} policies=0`);
console.log("permissions=service-role-only command_queue=phase1-disabled verification=read-only");
console.log(`nonce_permissions=rpc-execute-only migration=${nonceRpcMigrationName}`);

function assertNoncePrivilegeMigration(contents) {
  const statements = contents
    .split(";")
    .map((statement) => statement.trim().replace(/\s+/g, " ").toLowerCase())
    .filter(Boolean);

  assert.deepEqual(
    statements,
    [
      "begin",
      "set local lock_timeout = '5s'",
      "set local statement_timeout = '30s'",
      "revoke all privileges on table public.gps_ingest_nonces from service_role",
      "grant insert, delete on table public.gps_ingest_nonces to service_role",
      "commit"
    ],
    "Nonce privilege correction must contain only its transaction, timeouts, full revoke, and minimal grant."
  );
  assert.doesNotMatch(contents, /^\s*(?:insert|update|delete|merge|truncate)\b/im);
  assert.doesNotMatch(contents, /\b(?:drop\s+table|drop\s+column|alter\s+default\s+privileges)\b/i);
  assert.doesNotMatch(contents, /^\s*(?:create|alter|drop|comment)\b/im);
  assert.doesNotMatch(contents, /^\s*grant\b[^;]*\bto\s+(?:public|anon|authenticated)\b/im);
  assert.doesNotMatch(contents, /\bpublic\.(?!gps_ingest_nonces\b)[a-z0-9_]+\b/i);
}

function assertNonceRpcMigration(contents) {
  assert.equal((contents.match(/^\s*begin\s*;/gim) ?? []).length, 1);
  assert.equal((contents.match(/^\s*commit\s*;/gim) ?? []).length, 1);
  assert.match(contents, /set\s+local\s+lock_timeout\s*=\s*'5s'\s*;/i);
  assert.match(contents, /set\s+local\s+statement_timeout\s*=\s*'30s'\s*;/i);
  assert.match(contents, /to_regclass\('public\.gps_ingest_nonces'\)/i);
  assert.match(contents, /pg_get_userbyid\(c\.relowner\)[\s\S]*nonce_table_owner\s*<>\s*'postgres'/i);
  assert.match(contents, /to_regprocedure\('public\.mv930g_reserve_ingest_nonce\(text\)'\)/i);
  assert.match(contents, /existing_function_owner\s*<>\s*'postgres'/i);
  assert.match(
    contents,
    /create\s+or\s+replace\s+function\s+public\.mv930g_reserve_ingest_nonce\(p_nonce_hash\s+text\)[\s\S]*returns\s+boolean[\s\S]*language\s+plpgsql[\s\S]*volatile[\s\S]*security\s+definer[\s\S]*set\s+search_path\s*=\s*pg_catalog/i
  );
  assert.match(contents, /unexpected_table_grantees[\s\S]*information_schema\.table_privileges/i);
  assert.match(contents, /unexpected_function_grantees[\s\S]*information_schema\.routine_privileges/i);
  assert.match(
    contents,
    /delete\s+from\s+public\.gps_ingest_nonces\s+where\s+expires_at\s*<\s*reservation_time\s*;/i
  );
  assert.match(
    contents,
    /insert\s+into\s+public\.gps_ingest_nonces\s*\(nonce_hash,\s*expires_at\)[\s\S]*values\s*\(p_nonce_hash,\s*reservation_time\s*\+\s*interval\s*'10 minutes'\)[\s\S]*on\s+conflict\s+on\s+constraint\s+gps_ingest_nonces_pkey\s+do\s+nothing[\s\S]*returning\s+true\s+into\s+reserved/i
  );
  assert.match(contents, /return\s+reserved\s+is\s+true\s*;/i);
  assert.match(
    contents,
    /alter\s+function\s+public\.mv930g_reserve_ingest_nonce\(text\)\s+owner\s+to\s+postgres\s*;/i
  );
  assert.match(
    contents,
    /revoke\s+all\s+privileges\s+on\s+table\s+public\.gps_ingest_nonces\s+from\s+public,\s*anon,\s*authenticated,\s*service_role\s*;/i
  );
  assert.match(
    contents,
    /revoke\s+all\s+privileges\s+on\s+function\s+public\.mv930g_reserve_ingest_nonce\(text\)\s+from\s+public,\s*anon,\s*authenticated,\s*service_role\s*;/i
  );
  assert.match(
    contents,
    /grant\s+execute\s+on\s+function\s+public\.mv930g_reserve_ingest_nonce\(text\)\s+to\s+service_role\s*;/i
  );
  assert.equal(
    (contents.match(/revoke\s+all\s+privileges\s+on\s+table\s+public\.gps_ingest_nonces/gi) ?? []).length,
    1
  );
  assert.equal(
    (contents.match(/grant\s+execute\s+on\s+function\s+public\.mv930g_reserve_ingest_nonce\(text\)\s+to\s+service_role/gi) ?? []).length,
    1
  );
  assert.doesNotMatch(
    contents,
    /^\s*grant\s+execute\b[^;]*\bto\s+(?!service_role\b)[a-z0-9_, ]+\s*;/im,
    "Only service_role may receive EXECUTE on the nonce RPC."
  );
  assert.doesNotMatch(contents, /\bgrant\s+(?:select|insert|update|delete|truncate|references|trigger)\b/i);
  assert.doesNotMatch(contents, /\balter\s+default\s+privileges\b/i);
  assert.doesNotMatch(contents, /\bexecute\s+(?:format|immediate)|\bformat\s*\(/i);
  assert.doesNotMatch(contents, /^\s*(?:update|truncate)\b/im);
  assert.doesNotMatch(contents, /\bdrop\s+(?:table|column|schema|function)\b/i);
  assert.doesNotMatch(contents, /\b(?:enable|disable|force|no\s+force)\s+row\s+level\s+security\b/i);
  assert.doesNotMatch(contents, /\bcreate\s+(?:policy|table|index|trigger)\b/i);

  const publicObjects = [...contents.matchAll(/\bpublic\.([a-z0-9_]+)/gi)].map((match) => match[1]);
  assert.ok(publicObjects.length > 0);
  assert.deepEqual(
    [...new Set(publicObjects)].sort(),
    ["gps_ingest_nonces", "mv930g_reserve_ingest_nonce"],
    "Nonce RPC migration must not touch other public objects."
  );

  const withoutFunctionDefinition = contents.replace(
    /create\s+or\s+replace\s+function\s+public\.mv930g_reserve_ingest_nonce\([\s\S]*?\$mv930g_reserve_ingest_nonce\$\s*;/i,
    ""
  );
  assert.doesNotMatch(
    withoutFunctionDefinition,
    /^\s*(?:insert|update|delete|merge|truncate)\b/im,
    "The migration may define nonce DML inside the RPC but must not execute row DML while applying."
  );
}

function assertReadOnlyVerification(contents, label) {
  const stripped = stripSqlComments(contents);
  assert.match(stripped, /^\s*begin\s*;/im, `${label} must start a transaction.`);
  assert.match(stripped, /set\s+transaction\s+read\s+only\s*;/i, `${label} must be read-only.`);
  assert.match(stripped, /^\s*rollback\s*;/im, `${label} must finish without changes.`);
  assert.doesNotMatch(
    stripped,
    /^\s*(?:insert|update|delete|upsert|truncate|create|alter|drop|grant|revoke)\b/im,
    `${label} contains a mutating statement.`
  );
}

function stripSqlComments(contents) {
  return contents
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
