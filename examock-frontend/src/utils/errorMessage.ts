// src/utils/errorMessage.ts
// Pull a human-readable message out of an unknown thrown value.
//
// API failures surface as Axios errors shaped `{ response: { data: { message } } }`,
// but `catch` gives us `unknown`, so callers must narrow before reading. This helper
// does that narrowing in one place instead of casting to `any` at every call site
// (audit F13: explicit-`any` was masking the error path).

interface ApiErrorShape {
  response?: {
    data?: {
      message?: unknown;
    };
  };
  message?: unknown;
}

/**
 * Return `error.response.data.message` when present, else the error's own
 * `message`, else `fallback`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as ApiErrorShape;

    const apiMessage = candidate.response?.data?.message;
    if (typeof apiMessage === "string" && apiMessage.length > 0) {
      return apiMessage;
    }

    if (typeof candidate.message === "string" && candidate.message.length > 0) {
      return candidate.message;
    }
  }

  return fallback;
}
