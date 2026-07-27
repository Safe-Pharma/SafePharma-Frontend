/**
 * Extracts a flat string[] from any backend error response shape.
 *
 * Handles your GeneralResult error shape:
 * {
 *   errors: {
 *     Phone:    [{ errorCode: "...", errorMessage: "Invalid Egyptian phone number" }],
 *     Password: [{ errorCode: "...", errorMessage: "..." }, ...]
 *   },
 *   message: "One or more validation errors occurred."
 * }
 */
export function extractErrors(err: any): string[] {
  const body = err?.error;
  if (!body) return ['Something went wrong. Please try again.'];

  // Your backend shape: errors is { [field]: { errorCode, errorMessage }[] }
  if (body.errors && typeof body.errors === 'object' && !Array.isArray(body.errors)) {
    const messages: string[] = [];

    for (const fieldErrors of Object.values(body.errors) as any[]) {
      for (const e of fieldErrors) {
        // { errorCode, errorMessage } — your shape
        if (e?.errorMessage) {
          messages.push(e.errorMessage);
        // plain string fallback
        } else if (typeof e === 'string') {
          messages.push(e);
        }
      }
    }

    return messages.length > 0 ? messages : [body.message ?? 'Validation failed.'];
  }

  // Flat string array: { errors: ["msg1", "msg2"] }
  if (Array.isArray(body.errors)) {
    return body.errors.map((e: any) =>
      typeof e === 'string' ? e : (e?.errorMessage ?? JSON.stringify(e))
    );
  }

  // Single message: { message: "..." }
  if (body.message) return [body.message];

  return ['Something went wrong. Please try again.'];
}