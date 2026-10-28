const el = id => document.getElementById(id);
let quotes = [];
let page = 1;
const pageSize = 50;
const fmt = n => n === null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:3}).format(n);
function render() {
  const term = el('search').value.toLocaleUpperCase('tr-TR').trim();
  const selected = quotes.filter(q => `${q.symbol} ${q.underlying}`.toLocaleUpperCase('tr-TR').includes(term) && (!el('type').value || q.type === el('type').value) && (!el('underlying').value || q.underlying === el('underlying').value));
  const pages = Math.max(1, Math.ceil(selected.length / pageSize));
  page = Math.min(page, pages);
  el('pageInfo').textContent = `${selected.length} kayıt · Sayfa ${page} / ${pages}`;
  el('prev').disabled = page <= 1; el('next').disabled = page >= pages;
  el('rows').replaceChildren();
  for (const q of selected.slice((page-1)*pageSize, page*pageSize)) {
    const tr = document.createElement('tr');
    const values = [q.symbol, q.type === 'CALL' ? 'Alım' : 'Satım', q.expiry.split('-').reverse().join('.'), fmt(q.strike), fmt(q.underlyingPrice), fmt(q.bid), fmt(q.ask), fmt(q.spreadPercent), fmt(q.marketMakerBid), fmt(q.marketMakerAsk)];
    values.forEach((value, i) => {
      const td = document.createElement('td'); td.textContent = value;
      if (i === 0) { const small = document.createElement('small'); small.textContent = q.underlying; td.append(small); }
      if (i === 1) td.className = q.type.toLowerCase();
      tr.append(td);
    });
    el('rows').append(tr);
  }
  el('empty').hidden = selected.length > 0;
}
async function load() {
  el('refresh').disabled = true; el('error').hidden = true;
  el('status').textContent = 'Veri kaynağına bağlanılıyor…';
  try {
    const response = await fetch('/api/quotes', {signal:AbortSignal.timeout(20000)});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Veri alınamadı.');
    if (!Array.isArray(data.quotes)) throw new Error('Veri biçimi doğrulanamadı.');
    quotes = data.quotes;
    const previous = el('underlying').value;
    el('underlying').replaceChildren(new Option('Tüm dayanaklar', ''));
    [...new Set(quotes.map(q => q.underlying))].sort((a,b)=>a.localeCompare(b,'tr')).forEach(value => el('underlying').add(new Option(value,value)));
    if ([...el('underlying').options].some(o=>o.value===previous)) el('underlying').value=previous;
    page=1; render();
    el('status').textContent = `${quotes.length} varant · ${data.underlyingCount} dayanak · İnfo Varant${data.cached ? ' · Önbellekten' : ''}`;
    el('meta').textContent = `Kaynağın alındığı zaman: ${new Date(data.fetchedAt).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})} (Türkiye) · Fiyatın oluşma zamanı kaynakta doğrulanamadı. Önbellek süresi: 5 dakika.`;
  } catch (error) {
    quotes = []; el('rows').replaceChildren(); el('empty').hidden = true;
    el('status').textContent = 'Veri bağlantısı kurulamadı';
    el('error').textContent = error.name === 'TimeoutError' ? 'Bağlantı zaman aşımına uğradı. Yeniden deneyin.' : error.message;
    el('error').hidden = false;
    el('meta').textContent = 'Güncel veri yok. Fiyat gösterilmiyor.';
  } finally { el('refresh').disabled = false; }
}
el('refresh').addEventListener('click', load);
el('search').addEventListener('input', () => {page=1; render();});
el('type').addEventListener('change', () => {page=1; render();});
el('underlying').addEventListener('change', () => {page=1; render();});
el('prev').addEventListener('click', () => {page--; render();});
el('next').addEventListener('click', () => {page++; render();});
load();
