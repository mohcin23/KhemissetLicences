const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const sanitizeOptional = (value) => {
  const text = sanitizeString(value);
  return text === '' ? null : text;
};

const validateMaxLength = (value, max) => {
  if (value === undefined || value === null) return true;
  return String(value).length <= max;
};

module.exports = {
  sanitizeString,
  sanitizeOptional,
  validateMaxLength
};
