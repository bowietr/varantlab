export const PERIODS = {day:86400000, week:7*86400000, month:30*86400000};
export function validHistory(values, now=Date.now()) {
  if (!Array.isArray(values)) return [];
  const rows=values.filter(p=>p && Number.isFinite(p.time) && p.time<=now+60000 && p.time>=now-32*PERIODS.day && Number.isFinite(p.price) && p.price>0);
  return [...new Map(rows.map(p=>[p.time,{time:p.time,price:p.price}])).values()].sort((a,b)=>a.time-b.time).slice(-10000);
}
export function periodReturn(points, period, now=Date.now()) {
  if (!PERIODS[period] || points.length<2) return null;
  const cutoff=now-PERIODS[period];
  const base=points.filter(p=>p.time<=cutoff && p.time>=cutoff-2*PERIODS.day).at(-1);
  const latest=points.at(-1);
  if (!base || latest.time<now-PERIODS.day || latest.time<=base.time) return null;
  return (latest.price/base.price-1)*100;
}
