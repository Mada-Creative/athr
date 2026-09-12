// Wraps an async Express handler so a rejected promise reaches Express's
// error middleware (a 500 JSON response) instead of becoming an unhandled
// rejection that crashes the whole process.
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
