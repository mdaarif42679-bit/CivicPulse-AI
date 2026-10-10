export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const httpError = (status, message) => new HttpError(status, message);
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
