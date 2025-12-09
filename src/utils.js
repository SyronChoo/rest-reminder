/**
 * 获取周数键值 (ISO 8601格式)
 * @param {Date} date - 日期对象
 * @returns {string} 周数键值，格式：YYYY-WNN
 */
function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

/**
 * 从年份和周数获取日期
 * @param {number} year - 年份
 * @param {number} week - 周数
 * @returns {Date} 该周的起始日期
 */
function getDateFromWeek(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return ISOweekStart;
}

module.exports = {
  getWeekKey,
  getDateFromWeek,
};
