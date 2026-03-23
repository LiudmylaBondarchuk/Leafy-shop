export const COUNTRIES = [
  {
    code: "PL",
    name: "Poland",
    eu: true,
    phonePrefix: "+48",
    phoneDigits: 9,
    phoneStartsWith: ["45", "50", "51", "53", "57", "60", "66", "69", "72", "73", "78", "79", "88"],
    phoneError: "Polish mobile numbers start with 45, 50, 51, 53, 57, 60, 66, 69, 72, 73, 78, 79, or 88",
    zipFormat: "XX-XXX",
    zipRegex: /^\d{2}-\d{3}$/,
    zipPlaceholder: "00-001",
    vatRate: 23,
    vatLabel: "NIP",
    vatRegex: /^\d{10}$/,
    vatPlaceholder: "1234567890",
    validateVat: (nip: string) => {
      if (!/^\d{10}$/.test(nip)) return false;
      const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
      const digits = nip.split("").map(Number);
      const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
      return sum % 11 === digits[9];
    },
  },
  {
    code: "DE",
    name: "Germany",
    eu: true,
    phonePrefix: "+49",
    phoneDigits: 11,
    phoneStartsWith: ["15", "16", "17"],
    phoneError: "German mobile numbers start with 15, 16, or 17",
    zipFormat: "5 digits",
    zipRegex: /^\d{5}$/,
    zipPlaceholder: "10115",
    vatRate: 19,
    vatLabel: "VAT ID",
    vatRegex: /^DE\d{9}$/,
    vatPlaceholder: "DE123456789",
    validateVat: (vat: string) => /^DE\d{9}$/.test(vat),
  },
  {
    code: "GB",
    name: "United Kingdom",
    eu: false,
    phonePrefix: "+44",
    phoneDigits: 10,
    phoneStartsWith: ["7"],
    phoneError: "UK mobile numbers start with 7",
    zipFormat: "UK postcode",
    zipRegex: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i,
    zipPlaceholder: "SW1A 1AA",
    vatRate: 20,
    vatLabel: "VAT Number",
    vatRegex: /^GB\d{9,12}$/,
    vatPlaceholder: "GB123456789",
    validateVat: (vat: string) => /^GB\d{9,12}$/.test(vat),
  },
  {
    code: "US",
    name: "United States",
    eu: false,
    phonePrefix: "+1",
    phoneDigits: 10,
    phoneStartsWith: ["2", "3", "4", "5", "6", "7", "8", "9"],
    phoneError: "US phone numbers cannot start with 0 or 1",
    zipFormat: "5 digits",
    zipRegex: /^\d{5}(-\d{4})?$/,
    zipPlaceholder: "10001",
    vatRate: 0,
    vatLabel: "EIN",
    vatRegex: /^\d{9}$/,
    vatPlaceholder: "123456789",
    validateVat: (vat: string) => /^\d{9}$/.test(vat),
  },
  {
    code: "FR",
    name: "France",
    eu: true,
    phonePrefix: "+33",
    phoneDigits: 9,
    phoneStartsWith: ["6", "7"],
    phoneError: "French mobile numbers start with 6 or 7",
    zipFormat: "5 digits",
    zipRegex: /^\d{5}$/,
    zipPlaceholder: "75001",
    vatRate: 20,
    vatLabel: "VAT ID",
    vatRegex: /^FR[A-Z0-9]{2}\d{9}$/,
    vatPlaceholder: "FR12345678901",
    validateVat: (vat: string) => /^FR[A-Z0-9]{2}\d{9}$/.test(vat),
  },
  {
    code: "NL",
    name: "Netherlands",
    eu: true,
    phonePrefix: "+31",
    phoneDigits: 9,
    phoneStartsWith: ["6"],
    phoneError: "Dutch mobile numbers start with 6",
    zipFormat: "4 digits + 2 letters",
    zipRegex: /^\d{4}\s?[A-Z]{2}$/i,
    zipPlaceholder: "1012 AB",
    vatRate: 21,
    vatLabel: "VAT ID",
    vatRegex: /^NL\d{9}B\d{2}$/,
    vatPlaceholder: "NL123456789B01",
    validateVat: (vat: string) => /^NL\d{9}B\d{2}$/.test(vat),
  },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export function getCountry(code: string) {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0];
}

export function isEuCountry(code: string): boolean {
  const country = COUNTRIES.find((c) => c.code === code);
  return country?.eu ?? false;
}

/**
 * Polish VAT rate used for all gross prices in the database.
 * All product prices are stored as gross with 23% Polish VAT included.
 */
export const POLISH_VAT_RATE = 23;

export type VatScenario = "pl" | "eu_reverse_charge" | "eu_individual" | "non_eu_export";

/**
 * Determine the VAT scenario for invoice generation.
 * - PL customers: 23% VAT (standard Polish VAT)
 * - EU customers with VAT ID: 0% reverse charge
 * - EU customers without VAT ID: 23% VAT (same as PL)
 * - Non-EU customers: 0% export
 */
export function getVatScenario(countryCode: string, hasVatId: boolean): VatScenario {
  if (countryCode === "PL") return "pl";
  if (isEuCountry(countryCode)) {
    return hasVatId ? "eu_reverse_charge" : "eu_individual";
  }
  return "non_eu_export";
}

/**
 * Calculate invoice VAT breakdown from a gross amount (which includes 23% Polish VAT).
 * Returns the effective VAT rate, net amount, VAT amount, and label for the invoice.
 *
 * IMPORTANT: The customer always pays the gross price. This only affects invoice presentation.
 */
export function calculateInvoiceVat(grossAmountCents: number, scenario: VatScenario) {
  switch (scenario) {
    case "pl":
    case "eu_individual":
      // Standard: break down gross into net + 23% VAT
      return {
        vatRate: POLISH_VAT_RATE,
        netAmount: Math.round(grossAmountCents / (1 + POLISH_VAT_RATE / 100)),
        vatAmount: grossAmountCents - Math.round(grossAmountCents / (1 + POLISH_VAT_RATE / 100)),
        vatLabel: `VAT (${POLISH_VAT_RATE}%)`,
        vatNote: null,
      };
    case "eu_reverse_charge":
      // Reverse charge: invoice shows net price (gross / 1.23), 0% VAT
      return {
        vatRate: 0,
        netAmount: Math.round(grossAmountCents / (1 + POLISH_VAT_RATE / 100)),
        vatAmount: 0,
        vatLabel: "0% - Reverse charge",
        vatNote: "Reverse charge - VAT to be accounted for by the recipient pursuant to Art. 196 of Council Directive 2006/112/EC",
      };
    case "non_eu_export":
      // Export: invoice shows net price, 0% VAT
      return {
        vatRate: 0,
        netAmount: Math.round(grossAmountCents / (1 + POLISH_VAT_RATE / 100)),
        vatAmount: 0,
        vatLabel: "0% - Export outside EU",
        vatNote: null,
      };
  }
}
