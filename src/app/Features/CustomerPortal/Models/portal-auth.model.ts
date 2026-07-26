// Auth contracts for the patient-facing portal.
// Matches the real backend contract. IMPORTANT: both endpoints return HTTP 200 even on
// business-logic failure (wrong/expired OTP, unknown phone, etc.) — the outcome is only
// signalled via the `success` + `message` fields, never via HTTP status. Callers MUST check
// `success` themselves; an Observable `error` callback will only fire for actual transport/
// server errors (network down, 500, etc.), not for "wrong code".
//   POST /api/Otp/request { phone } -> OtpEnvelope<null>
//   POST /api/Otp/verify  { phone, code } -> OtpEnvelope<VerifyOtpData>

export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
}

export interface OtpEnvelope<T> {
  data: T | null;
  success: boolean;
  message: string;
}

export interface VerifyOtpData {
  accessToken: string;
  durationInMinutes: number;
  tokenType: string;
}

export interface PortalSessionInfo {
  customerId: string;
  name: string;
  phone: string;
  initials: string;
  token: string;
}