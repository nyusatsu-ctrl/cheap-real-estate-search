import { promises as fs } from "fs";
import path from "path";
import type { LoanFormCompany, LoanFormConfig } from "./types";

const supportedCompanies: LoanFormCompany[] = ["premium"];

export function assertSupportedCompany(company: string): asserts company is LoanFormCompany {
  if (!supportedCompanies.includes(company as LoanFormCompany)) {
    throw new Error(`Unsupported loan form company: ${company}`);
  }
}

export function getLoanFormConfigPath(company: LoanFormCompany) {
  return path.join(process.cwd(), "templates", `${company}.json`);
}

export async function readLoanFormConfig(company: LoanFormCompany): Promise<LoanFormConfig> {
  const configPath = getLoanFormConfigPath(company);
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw) as LoanFormConfig;
}

export async function writeLoanFormConfig(company: LoanFormCompany, config: LoanFormConfig) {
  const configPath = getLoanFormConfigPath(company);
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export function publicPathToFilePath(publicPath: string) {
  return path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
}
