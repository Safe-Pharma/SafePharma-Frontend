import { Injectable } from '@angular/core';

const STAFF_TOKEN_KEY = 'token';
const PORTAL_TOKEN_KEY = 'portal_token';

// Staff (pharmacist) and patient identities are logically separate apps sharing one
// Angular bundle for now. They must never both be "logged in" in the same browser at
// once — otherwise navigating to the other route tree silently lets you in as whichever
// identity still has a token sitting in localStorage. This service is the single place
// that knows both storage keys, so AuthSessionService and PortalAuthService don't need
// to depend on each other directly.
@Injectable({ providedIn: 'root' })
export class SessionScopeService {
  constructor() {
    // Defensive cleanup for browsers where both tokens already coexist from before this
    // mutual-exclusion rule existed (e.g. a dev machine that logged into both). Once this
    // has run once, activateStaffSession()/activatePortalSession() keep it from recurring.
    if (this.hasStaffToken() && this.hasPortalToken()) {
      localStorage.removeItem(STAFF_TOKEN_KEY);
      localStorage.removeItem(PORTAL_TOKEN_KEY);
    }
  }

  activateStaffSession(): void {
    localStorage.removeItem(PORTAL_TOKEN_KEY);
  }

  activatePortalSession(): void {
    localStorage.removeItem(STAFF_TOKEN_KEY);
  }

  hasStaffToken(): boolean {
    return !!localStorage.getItem(STAFF_TOKEN_KEY);
  }

  hasPortalToken(): boolean {
    return !!localStorage.getItem(PORTAL_TOKEN_KEY);
  }
}