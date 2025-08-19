export function filterByTimeRange(data, range) {
  const now = new Date();
  let start;
  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case "month":
      start = new Date(now);
      start.setMonth(now.getMonth() - 1);
      break;
    default:
      return data;
  }
  return data.filter(point => new Date(point.time) >= start);
}
