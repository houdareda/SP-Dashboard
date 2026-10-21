function getCairoUtcRange(startDate, endDate) {
  let startUtc = undefined;
  let endUtc = undefined;

  if (startDate) {
    startUtc = new Date(`${startDate}T00:00:00+03:00`).toISOString();
  }
  if (endDate) {
    endUtc = new Date(`${endDate}T23:59:59.999+03:00`).toISOString();
  }

  return { startUtc, endUtc };
}

console.log(getCairoUtcRange('2026-10-21', '2026-10-21'));
console.log(getCairoUtcRange('2026-10-20', '2026-10-21'));
