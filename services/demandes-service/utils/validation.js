const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim();
};

const sanitizeOptional = (value) => {
  if (value === undefined || value === null) return null;
  const text = sanitizeString(value);
  return text === '' || text === undefined ? null : text;
};

const validateMaxLength = (value, max) => {
  if (value === undefined || value === null) return true;
  return String(value).length <= max;
};

const CIN_REGEX = /^[A-Z]{1,2}[0-9]{5,6}$/;
const isValidCin = (value) => {
  if (typeof value !== 'string') return false;
  return CIN_REGEX.test(value.trim().toUpperCase());
};

const isValidDateString = (value) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value !== 'string') return false;
  const text = value.trim();
  if (text === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [year, month, day] = text.split('-').map(Number);
  const date = new Date(text);
  return !Number.isNaN(date.getTime()) && date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
};

module.exports = { sanitizeString, sanitizeOptional, validateMaxLength, isValidCin, isValidDateString };
