export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; message: string };

export type GpsCustomerInput = {
  full_name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  contract_type: "car" | "bike";
  contract_status: "screening" | "active" | "overdue" | "paid_off" | "cancelled";
  notes: string | null;
};

export type GpsVehicleInput = {
  customer_id: string | null;
  vehicle_type: "car" | "bike";
  maker: string | null;
  model_name: string | null;
  model_year: number | null;
  vin: string | null;
  license_plate: string | null;
  status: "active" | "sold" | "returned" | "inactive";
};

export type GpsDeviceInput = {
  vehicle_id: string | null;
  device_name: string;
  imei: string;
  device_identifier: string;
  sim_phone_number: string | null;
  iccid: string | null;
  connection_status: "online" | "offline";
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEVICE_IDENTIFIER_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const IMEI_PATTERN = /^\d{14,16}$/;

export function validateGpsCustomerInput(input: Record<string, unknown>): ValidationResult<GpsCustomerInput> {
  const errors: Record<string, string> = {};
  const fullName = requiredText(input.full_name, 120, "氏名", errors, "full_name");
  const phone = optionalText(input.phone, 50, "電話番号", errors, "phone");
  const address = optionalText(input.address, 300, "住所", errors, "address");
  const email = optionalText(input.email, 254, "メールアドレス", errors, "email");
  const notes = optionalText(input.notes, 2000, "備考", errors, "notes");
  const contractType = enumValue(input.contract_type, ["car", "bike"] as const, "契約種別", errors, "contract_type");
  const contractStatus = enumValue(
    input.contract_status,
    ["screening", "active", "overdue", "paid_off", "cancelled"] as const,
    "契約状態",
    errors,
    "contract_status"
  );

  if (email && !EMAIL_PATTERN.test(email)) errors.email = "メールアドレスの形式を確認してください。";
  if (Object.keys(errors).length) return invalid(errors);

  return {
    ok: true,
    data: {
      full_name: fullName!,
      phone,
      address,
      email,
      contract_type: contractType!,
      contract_status: contractStatus!,
      notes
    }
  };
}

export function validateGpsVehicleInput(input: Record<string, unknown>): ValidationResult<GpsVehicleInput> {
  const errors: Record<string, string> = {};
  const customerId = optionalUuid(input.customer_id, "顧客", errors, "customer_id");
  const vehicleType = enumValue(input.vehicle_type, ["car", "bike"] as const, "車両区分", errors, "vehicle_type");
  const maker = optionalText(input.maker, 100, "メーカー", errors, "maker");
  const modelName = optionalText(input.model_name, 160, "車名・型式", errors, "model_name");
  const vin = optionalText(input.vin, 100, "車台番号", errors, "vin");
  const licensePlate = optionalText(input.license_plate, 100, "登録番号", errors, "license_plate");
  const status = enumValue(input.status, ["active", "sold", "returned", "inactive"] as const, "状態", errors, "status");
  const modelYear = optionalInteger(input.model_year, 1900, 2100, "年式", errors, "model_year");

  if (!modelName && !vin && !licensePlate) {
    errors.model_name = "車名・型式、車台番号、登録番号のいずれかを入力してください。";
  }
  if (Object.keys(errors).length) return invalid(errors);

  return {
    ok: true,
    data: {
      customer_id: customerId,
      vehicle_type: vehicleType!,
      maker,
      model_name: modelName,
      model_year: modelYear,
      vin,
      license_plate: licensePlate,
      status: status!
    }
  };
}

export function validateGpsDeviceInput(input: Record<string, unknown>): ValidationResult<GpsDeviceInput> {
  const errors: Record<string, string> = {};
  const vehicleId = optionalUuid(input.vehicle_id, "車両", errors, "vehicle_id");
  const deviceName = requiredText(input.device_name, 120, "機種名・端末名", errors, "device_name");
  const imei = requiredText(input.imei, 16, "IMEI", errors, "imei");
  const deviceIdentifier = requiredText(input.device_identifier, 64, "管理用端末ID", errors, "device_identifier");
  const simPhoneNumber = optionalText(input.sim_phone_number, 64, "SIM管理番号", errors, "sim_phone_number");
  const iccid = optionalText(input.iccid, 64, "SIM管理ラベル・ICCID", errors, "iccid");
  const connectionStatus = enumValue(
    input.connection_status,
    ["online", "offline"] as const,
    "接続状態",
    errors,
    "connection_status"
  );

  if (imei && !IMEI_PATTERN.test(imei)) errors.imei = "IMEIは14〜16桁の数字で入力してください。";
  if (deviceIdentifier && !DEVICE_IDENTIFIER_PATTERN.test(deviceIdentifier)) {
    errors.device_identifier = "管理用端末IDは6〜64文字の英数字、ハイフン、アンダースコアで入力してください。";
  }
  if (Object.keys(errors).length) return invalid(errors);

  return {
    ok: true,
    data: {
      vehicle_id: vehicleId,
      device_name: deviceName!,
      imei: imei!,
      device_identifier: deviceIdentifier!,
      sim_phone_number: simPhoneNumber,
      iccid,
      connection_status: connectionStatus!
    }
  };
}

export function validateGpsRecordId(value: unknown) {
  const candidate = String(value ?? "").trim();
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

export function getGpsDeviceDuplicateError(
  deviceIdentifierExists: boolean,
  imeiExists: boolean
): { message: string; fieldErrors: Record<string, string> } | null {
  if (deviceIdentifierExists) {
    return {
      message: "この管理用端末IDは既に登録されています。",
      fieldErrors: { device_identifier: "別の管理用端末IDを入力してください。" }
    };
  }
  if (imeiExists) {
    return {
      message: "このIMEIは既に登録されています。",
      fieldErrors: { imei: "別のIMEIを入力してください。" }
    };
  }
  return null;
}

function invalid(errors: Record<string, string>): ValidationResult<never> {
  return { ok: false, errors, message: Object.values(errors)[0] ?? "入力内容を確認してください。" };
}

function requiredText(
  value: unknown,
  maxLength: number,
  label: string,
  errors: Record<string, string>,
  field: string
) {
  const candidate = String(value ?? "").trim();
  if (!candidate) {
    errors[field] = `${label}は必須です。`;
    return null;
  }
  if (candidate.length > maxLength) {
    errors[field] = `${label}は${maxLength}文字以内で入力してください。`;
    return null;
  }
  return candidate;
}

function optionalText(
  value: unknown,
  maxLength: number,
  label: string,
  errors: Record<string, string>,
  field: string
) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;
  if (candidate.length > maxLength) {
    errors[field] = `${label}は${maxLength}文字以内で入力してください。`;
    return null;
  }
  return candidate;
}

function optionalUuid(value: unknown, label: string, errors: Record<string, string>, field: string) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;
  if (!UUID_PATTERN.test(candidate)) {
    errors[field] = `${label}の指定が不正です。`;
    return null;
  }
  return candidate;
}

function optionalInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
  errors: Record<string, string>,
  field: string
) {
  const candidate = String(value ?? "").trim();
  if (!candidate) return null;
  const parsed = Number(candidate);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    errors[field] = `${label}は${minimum}〜${maximum}の整数で入力してください。`;
    return null;
  }
  return parsed;
}

function enumValue<const T extends readonly string[]>(
  value: unknown,
  choices: T,
  label: string,
  errors: Record<string, string>,
  field: string
) {
  const candidate = String(value ?? "").trim();
  if (!choices.includes(candidate)) {
    errors[field] = `${label}の指定が不正です。`;
    return null;
  }
  return candidate as T[number];
}
