// Both government feeds report times in local timezones with abbreviations
// ("EDT", "PST"...). We store everything in UTC so the archive is unambiguous.

const TZ_OFFSET_HOURS = {
  NDT: -2.5, NST: -3.5,
  ADT: -3, AST: -4,
  EDT: -4, EST: -5,
  CDT: -5, CST: -6,
  MDT: -6, MST: -7,
  PDT: -7, PST: -8,
};

// Ontario 511 reports times as Unix epoch seconds.
export function epochToIso(seconds) {
  if (typeof seconds !== 'number' || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

// Build a UTC ISO timestamp from local date/time parts + a timezone abbreviation.
// Returns null if the abbreviation is unknown — better no timestamp than a wrong one.
export function zonedToUtcIso(year, month, day, hour, minute, tz) {
  const offset = TZ_OFFSET_HOURS[tz];
  if (offset === undefined) return null;
  const ms = Date.UTC(year, month - 1, day, hour, minute) - offset * 3600 * 1000;
  return new Date(ms).toISOString();
}
