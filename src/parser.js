export const SOURCE = 'https://infovarant.com/piyasa/varant-fiyat-izleme';
function numeric(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d{3})*(?:,\d+)?$/.test(value.trim())) return null;
  return Number(value.trim().replace(/\./g, '').replace(',', '.'));
}
function csvArray(text) {
  const marker = /"csvData"\s*:\s*\[/g.exec(text);
  if (!marker) throw new Error('Kaynağın tam varant listesi bulunamadı.');
  const start = marker.index + marker[0].length - 1;
  let depth = 0, quoted = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
  }
  throw new Error('Kaynak listesi eksik geldi.');
}
export function parseQuotes(html) {
  // Read public server-rendered data; never execute scripts from the source.
  let text = '';
  for (const match of html.matchAll(/<script\b[^>]*>\s*self\.__next_f\.push\((\[[\s\S]*?\])\)\s*;?\s*<\/script>/g)) {
    const chunk = JSON.parse(match[1]);
    if (chunk[0] === 1 && typeof chunk[1] === 'string') text += chunk[1];
  }
  const source = csvArray(text);
  if (!Array.isArray(source) || !source.length) throw new Error('Tam varant listesi boş.');
  const quotes = source.map(row => {
    if (!/^[A-Z0-9]{5}V$/.test(row.varant) || !['C', 'P'].includes(row.tur) || !/^\d{2}\.\d{2}\.\d{4}$/.test(row.vadeTarihi) || typeof row.dayanak !== 'string') throw new Error('Kaynak veri yapısı değişmiş.');
    const [d,m,y] = row.vadeTarihi.split('.');
    const price = key => {const value = numeric(row[key]); return value !== null && value >= 0 ? value : null;};
    const bid = price('alis'), ask = price('satis');
    const quoteAvailable = bid !== null && ask !== null && ask > 0 && bid <= ask;
    return {symbol:row.varant.slice(0,-1)+'.V', type:row.tur === 'C'?'CALL':'PUT', underlying:row.dayanak, expiry:`${y}-${m}-${d}`, multiplier:price('carpan'), strike:price('kullanimFiyati'), underlyingPrice:price('dayanakValue'), marketMakerBid:price('pyAlis'), marketMakerAsk:price('pySatis'), changePercent:numeric(row.yuzde), lastPrice:price('sonFiyat'), annualRate:typeof row.faiz==='string'&&/^\d+(?:\.\d+)?$/.test(row.faiz)?Number(row.faiz):null, dividendValue:typeof row.temettuValue==='number'?row.temettuValue:null, bid, ask, spreadPercent:quoteAvailable?(ask-bid)/ask*100:null, quoteAvailable, quoteTime:null};
  });
  if (new Set(quotes.map(q=>q.symbol)).size !== source.length) throw new Error('Kaynakta tekrar eden varant kodu var.');
  return quotes;
}
