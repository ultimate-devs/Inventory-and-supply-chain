export const sendResponse = (res, statusCode, { data = null, message = '', meta = undefined } = {}) => {
  const body = { success: statusCode < 400, data, message };
  if (meta !== undefined) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
