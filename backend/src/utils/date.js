// All dates are stored/passed as plain YYYY-MM-DD strings so client and
// server never fight over timezones — the device decides "today".
function isValidDateParam(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = { isValidDateParam, todayISO };
