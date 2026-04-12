import type { FirestoreDate } from "./types";

function toDate(value: FirestoreDate) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if ("seconds" in value && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  return null;
}

export function getDateValue(value: FirestoreDate) {
  return toDate(value);
}

export function formatDate(value: FirestoreDate, locale = "id-ID") {
  const date = toDate(value);

  if (!date) return "-";

  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(value: FirestoreDate, locale = "id-ID") {
  const date = toDate(value);

  if (!date) return "-";

  return date.toLocaleString(locale);
}
