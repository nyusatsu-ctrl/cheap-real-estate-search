export type LoanFormCompany = "premium";

export type LoanFormFieldKey =
  | "addressPrefecture"
  | "addressDetail"
  | "addressKana"
  | "phone"
  | "mobile"
  | "email"
  | "birthDate"
  | "age"
  | "workplace"
  | "workplaceKana"
  | "workAddressPrefecture"
  | "workAddressCity"
  | "workAddressStreet"
  | "workPhone"
  | "businessContent"
  | "yearsEmployed"
  | "payday"
  | "annualIncome"
  | "companyName"
  | "companyRepresentative"
  | "companyAddress"
  | "companyPhone"
  | "companyFax"
  | "salesStaff";

export type LoanFormInput = Record<LoanFormFieldKey, string>;

export type LoanFormFieldConfig = {
  label: string;
  x: number;
  y: number;
  fontSize?: number;
  maxWidth?: number;
  backgroundWhite?: boolean;
};

export type LoanFormConfig = {
  company: LoanFormCompany;
  label: string;
  templateImage: string;
  page: {
    size: "A4";
    orientation: "portrait" | "landscape";
    dpi: number;
    widthPx: number;
    heightPx: number;
    offsetX: number;
    offsetY: number;
  };
  defaults: {
    fontSize: number;
    fontColor: string;
  };
  whiteouts?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  fields: Record<LoanFormFieldKey, LoanFormFieldConfig>;
};

export const loanFormFieldOrder: LoanFormFieldKey[] = [
  "addressPrefecture",
  "addressDetail",
  "addressKana",
  "phone",
  "mobile",
  "email",
  "birthDate",
  "age",
  "workplace",
  "workplaceKana",
  "workAddressPrefecture",
  "workAddressCity",
  "workAddressStreet",
  "workPhone",
  "businessContent",
  "yearsEmployed",
  "payday",
  "annualIncome",
  "companyName",
  "companyRepresentative",
  "companyAddress",
  "companyPhone",
  "companyFax",
  "salesStaff"
];
