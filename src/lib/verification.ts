// Free email providers blocked for professional accounts
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.fr", "ymail.com",
  "hotmail.com", "hotmail.fr", "outlook.com", "outlook.fr", "live.com", "live.fr",
  "icloud.com", "me.com", "aol.com", "protonmail.com", "proton.me",
  "gmx.com", "gmx.fr", "gmx.de", "mail.com", "yandex.com", "yandex.ru",
  "free.fr", "orange.fr", "wanadoo.fr", "laposte.net", "sfr.fr", "neuf.fr",
  "hey.com", "fastmail.com", "tutanota.com", "zoho.com",
]);

export const isFreeEmailDomain = (email: string): boolean => {
  const domain = email.toLowerCase().trim().split("@")[1];
  if (!domain) return false;
  return FREE_EMAIL_DOMAINS.has(domain);
};

export const requiresProEmail = (role: string): boolean =>
  ["producteur", "torrefacteur", "shop"].includes(role);

// EU VAT country codes
export const EU_VAT_COUNTRIES: { code: string; name: string }[] = [
  { code: "AT", name: "Autriche" }, { code: "BE", name: "Belgique" },
  { code: "BG", name: "Bulgarie" }, { code: "HR", name: "Croatie" },
  { code: "CY", name: "Chypre" }, { code: "CZ", name: "Tchéquie" },
  { code: "DK", name: "Danemark" }, { code: "EE", name: "Estonie" },
  { code: "FI", name: "Finlande" }, { code: "FR", name: "France" },
  { code: "DE", name: "Allemagne" }, { code: "GR", name: "Grèce" },
  { code: "HU", name: "Hongrie" }, { code: "IE", name: "Irlande" },
  { code: "IT", name: "Italie" }, { code: "LV", name: "Lettonie" },
  { code: "LT", name: "Lituanie" }, { code: "LU", name: "Luxembourg" },
  { code: "MT", name: "Malte" }, { code: "NL", name: "Pays-Bas" },
  { code: "PL", name: "Pologne" }, { code: "PT", name: "Portugal" },
  { code: "RO", name: "Roumanie" }, { code: "SK", name: "Slovaquie" },
  { code: "SI", name: "Slovénie" }, { code: "ES", name: "Espagne" },
  { code: "SE", name: "Suède" },
];
