// Initial server-rendered page only: not the full market universe.
export const SOURCE = 'https://infovarant.com/piyasa/varant-fiyat-izleme';
const clean = value => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function number(value) {
  const v = value.trim();
  if (!/^-?\d+(?:\.\d{3})*(?:,\d+)?$/.test(v)) return null;
  const n = Number(v.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
export function parseQuotes(html) {
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const result = [];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x => clean(x[1])).filter(Boolean);
    if (cells.length !== 12) continue;
    const symbol = cells[0].match(/\b[A-Z0-9]{5}\.V\b/)?.[0];
    if (!symbol || !/^\d{2}\/\d{2}\/\d{2}$/.test(cells[1])) continue;
    const type = cells[0].includes('Alım') ? 'CALL' : cells[0].includes('Satım') ? 'PUT' : null;
    const [multiplier, strike, underlyingPrice, marketMakerBid, marketMakerAsk, changePercent, bid, ask] = cells.slice(2, 10).map(number);
    if (!type || [multiplier, strike, underlyingPrice, marketMakerBid, marketMakerAsk, bid, ask].some(x => x === null || x < 0)) continue;
    if (ask < bid) continue;
    const [d, m, y] = cells[1].split('/');
    result.push({symbol, type, underlying:cells[10], expiry:`20${y}-${m}-${d}`, multiplier, strike, underlyingPrice, marketMakerBid, marketMakerAsk, changePercent, bid, ask, spreadPercent:ask > 0 ? (ask - bid) / ask * 100 : null, quoteTime:null});
  }
  if (!result.length) throw new Error('Kaynak tablo yapısı değişmiş veya fiyat verisi bulunamıyor.');
  return [...new Map(result.map(q => [q.symbol, q])).values()];
}
