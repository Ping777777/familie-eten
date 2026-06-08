export function getMondayOfWeek(offset = 0, baseDate = new Date()) {
  const day = baseDate.getDay(); // 0 = Sun
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getIsoWeekInfo(offset = 0, baseDate = new Date()) {
  const monday = getMondayOfWeek(offset, baseDate);
  const isoThursday = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3));
  const isoYear = isoThursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstThursdayDay = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstThursdayDay);
  const week = 1 + Math.round((isoThursday - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return { year: isoYear, week };
}

export function getIsoWeekKey(offset = 0, baseDate = new Date()) {
  const { year, week } = getIsoWeekInfo(offset, baseDate);
  return `${year}-W${String(week).padStart(2, "0")}`;
}
