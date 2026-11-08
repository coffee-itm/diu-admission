/**
 * Error with an HTTP status and a machine-readable code from the table in
 * context/15-api-spec.md §1. The errors plugin turns it into the response envelope.
 */
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message ?? code)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * @param {number} status HTTP status
 * @param {string} code error code, e.g. 'NOT_FOUND'
 * @param {string} [message] human-readable message
 * @param {{ path: string, message: string }[]} [details]
 */
export function httpError(status, code, message, details) {
  return new HttpError(status, code, message, details)
}
