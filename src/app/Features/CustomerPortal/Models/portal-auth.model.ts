

export interface SendOtpRequest {
  phone: string;
}

export interface VerifyOtpRequest {
  phone: string;
  code: string;
}

export interface VerifyOtpResponse {
  token: string;
}

export interface PortalSessionInfo {
  customerId: string;
  name: string;
  phone: string;
  initials: string;
  token: string;
}