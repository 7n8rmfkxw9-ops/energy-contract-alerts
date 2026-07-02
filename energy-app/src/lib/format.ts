export const formatEur = (value: number) =>
  value.toLocaleString("fr-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
