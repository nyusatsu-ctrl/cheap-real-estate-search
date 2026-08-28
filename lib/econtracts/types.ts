export type EcontractKind = "purchase_intent" | "vehicle_confirmation";
export type EcontractStatus = "draft" | "sent" | "opened" | "verified" | "signed" | "cancelled";
export type EcontractActorKind = "admin" | "customer" | "system";

export type EcontractImportantItem = {
  id: string;
  text: string;
};

export type EcontractCustomerSnapshot = {
  id: string;
  name: string;
  kana: string | null;
  email: string;
  phone: string | null;
  postalCode: string | null;
  address: string | null;
};

export type VehicleConfirmationTerms = {
  vehicleType: "car" | "bike";
  maker: string;
  model: string;
  grade: string;
  modelCode: string;
  firstRegistration: string;
  mileage: number;
  chassisNumber: string;
  chassisNumberStatus: "confirmed" | "pending";
  vehiclePrice: number;
  fees: number;
  totalPrice: number;
  downPayment: number;
  tradeInAmount: number;
  financedAmount: number;
  installmentCount: number;
  firstPaymentAmount: number;
  monthlyPayment: number;
  bonusPayment: string;
  deliveryMethod: string;
  deliveryEstimate: string;
  warranty: string;
  specialTerms: string;
  auctionPurchase: boolean;
};

export type EcontractDocumentSnapshot = {
  title: string;
  version: string;
  html: string;
  text: string;
  importantItems: EcontractImportantItem[];
};

export type SalesEcontract = {
  id: string;
  contract_id: string;
  customer_id: string;
  loan_id: string;
  loan_application_number_snapshot: string | null;
  contract_kind: EcontractKind;
  revision: number;
  management_number: string;
  status: EcontractStatus;
  document_title: string;
  document_version: string;
  document_html_snapshot: string;
  document_text_snapshot: string;
  document_hash: string;
  customer_snapshot: EcontractCustomerSnapshot;
  terms_snapshot: Record<string, unknown>;
  important_items_snapshot: EcontractImportantItem[];
  consent_snapshot: EcontractConsentSnapshot | null;
  signature_snapshot: Record<string, unknown> | null;
  evidence_hash: string | null;
  link_token_hash: string;
  link_expires_at: string;
  delivery_revision: number;
  delivery_method: "email";
  delivery_destination_masked: string;
  created_by_profile_id: string | null;
  sent_by_profile_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  identity_confirmed_at: string | null;
  verified_at: string | null;
  signed_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  signer_ip: string | null;
  signer_user_agent: string | null;
  signer_device_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type EcontractConsentSnapshot = {
  confirmedAt: string;
  items: Array<EcontractImportantItem & { agreed: true }>;
};

export type SalesEcontractVerification = {
  id: string;
  econtract_id: string;
  access_session_id: string;
  delivery_revision: number;
  method: "email_otp";
  destination_masked: string;
  otp_hash: string;
  expires_at: string;
  attempt_count: number;
  max_attempts: number;
  sent_at: string;
  resend_available_at: string;
  rate_window_started_at: string;
  resend_count: number;
  verified_at: string | null;
  invalidated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SalesEcontractAccessSession = {
  id: string;
  econtract_id: string;
  delivery_revision: number;
  expires_at: string;
  identity_confirmed_at: string;
  revoked_at: string | null;
};

export type SalesEcontractEvent = {
  id: string;
  econtract_id: string;
  event_type: string;
  actor_kind: EcontractActorKind;
  actor_profile_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  device_json: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminEcontractSummary = {
  contracts: SalesEcontract[];
  tableMissing: boolean;
  featureDisabled?: boolean;
  errorMessage?: string;
};

export type PublicEcontractView = {
  contract: SalesEcontract;
  identityConfirmed: boolean;
  otpVerified: boolean;
  maskedCustomerName: string;
  expired: boolean;
};

export type RequestEvidence = {
  ipAddress: string | null;
  userAgent: string | null;
  device: Record<string, string>;
};
