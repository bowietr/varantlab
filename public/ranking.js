import {calculatePosition} from './calculator.js';
// Only known TRY-priced domestic shares / index; FX conversion is not inferred.
const TRY_UNDERLYINGS = new Set(['AEFES','AKBNK','ASELS','ASTOR','BIMAS','EKGYO','ENKAI','EREGL','FROTO','GARAN','GUBRF','ISCTR','KCHOL','KRDMD','MGROS','PETKM','PGSUS','SAHOL','SASA','SISE','TAVHL','TCELL','THYAO','TOASO','TRALT','TTKOM','TUPRS','VAKBN','XU030','YKBNK']);
export function gearing(q) {
  if (!TRY_UNDERLYINGS.has(q.underlying) || !Number.isFinite(q.underlyingPrice) || q.underlyingPrice<=0 || !Number.isFinite(q.multiplier) || q.multiplier<=0 || !Number.isFinite(q.ask) || q.ask<=0) return null;
  return q.underlyingPrice*q.multiplier/q.ask;
}
export function daysToExpiry(expiry, now=Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry||'')) return null;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
  const day=Date.parse(expiry+'T00:00:00Z'), start=Date.parse(today+'T00:00:00Z');
  return Number.isFinite(day)&&Number.isFinite(start)?Math.round((day-start)/86400000):null;
}
export function sortQuotes(quotes, mode, {amount,underlying,type,now=Date.now()}={}) {
  let rows=[...quotes];
  if (['spread','gearing'].includes(mode)) {
    if (!underlying || !type) return [];
    rows=rows.filter(q=>{
      const p=calculatePosition(amount,q.bid,q.ask), days=daysToExpiry(q.expiry,now);
      return q.underlying===underlying && q.type===type && p && p.quantity>0 && p.spreadPercent!==null && days!==null && days>=0 && (mode!=='gearing'||gearing(q)!==null);
    });
  }
  const metric=q=>mode==='spread'?calculatePosition(amount,q.bid,q.ask)?.spreadPercent??null:mode==='gearing'?gearing(q):mode.startsWith('daily')?Number.isFinite(q.changePercent)?q.changePercent:null:mode.startsWith('expiry')?daysToExpiry(q.expiry,now):null;
  if(mode==='symbol')return rows.sort((a,b)=>a.symbol.localeCompare(b.symbol));
  return rows.sort((a,b)=>{
    const x=metric(a), y=metric(b);
    if(x===null && y!==null)return 1;if(y===null&&x!==null)return -1;
    if(x!==null&&y!==null&&x!==y)return ['gearing','dailyDesc','expiryDesc'].includes(mode)?y-x:x-y;
    return a.symbol.localeCompare(b.symbol);
  });
}
