/**
 * Masks a phone number, showing only the last 4 digits.
 * e.g. "+1 555-123-4567" → "•••• 4567"
 */
export const maskPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return phone;
  return "•••• " + digits.slice(-4);
};
