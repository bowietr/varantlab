import {calculatePosition} from './calculator.js';
const el = id => document.getElementById(id);
let quotes = [];
let page = 1;
const pageSize = 50;
const fmt = n => n === null || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:3}).format(n);
try {
  const saved = Number(localStorage.getItem('varantlab.amount'));
  if (saved > 0 && saved <= 1e9) el('amount').value = saved;
} catch {}
function render() {
  const amount = el('amount').valueAsNumber;
  const validAmount = Number.isFinite(amount) && amount > 0 && amount <= 1e9;
  el('budgetError').hidden = validAmount;
  el('budgetError').textContent = validAmount ? '' : '0 ile 1 milyar TL arasında pozitif bir işlem tutarı girin.';
  const ranking = el('sort').value === 'spread';
  const comparable = !!el('underlying').value && !!el('type').value;
  el('sortNote').textContent = ranking ? (comparable ? 'Aynı dayanak ve yönde, bütçeyle en az 1 adet alınabilen ve geçerli alış/satışı olan ürünler makas yüzdesine göre sıralanır. Bu bir başarı veya toplam kalite puanı değildir; delta, teta ve derinlik henüz dahil değil.' : 'Makas karşılaştırması için bir dayanak ve Alım/Satım türü seçin.') : '';

  const term = el('search').value.toLocaleUpperCase('tr-TR').trim();
  let selected = quotes.filter(q => `${q.symbol} ${q.underlying}`.toLocaleUpperCase('tr-TR').includes(term) && (!el('type').value || q.type === el('type').value) && (!el('underlying').value || q.underlying === el('underlying').value));
  if (ranking) {
    selected = comparable && validAmount ? selected.filter(q => {
      const position = calculatePosition(amount,q.bid,q.ask);
      return position && position.quantity > 0 && position.spreadPercent !== null;
    }).sort((a,b) => ((a.ask-a.bid)/a.ask)-((b.ask-b.bid)/b.ask) || a.symbol.localeCompare(b.symbol)) : [];
  } else selected.sort((a,b)=>a.symbol.localeCompare(b.symbol));
  const pages = Math.max(1, Math.ceil(selected.length / pageSize));
  page = Math.min(page, pages);
  el('pageInfo').textContent = `${selected.length} kayıt · Sayfa ${page} / ${pages}`;
  el('prev').disabled = page <= 1; el('next').disabled = page >= pages;
  el('rows').replaceChildren();
  for (const q of selected.slice((page-1)*pageSize, page*pageSize)) {
    const tr = document.createElement('tr');
    const position = validAmount ? calculatePosition(amount,q.bid,q.ask) : null;
    const values = [q.symbol, q.type === 'CALL' ? 'Alım' : 'Satım', q.expiry.split('-').reverse().join('.'), fmt(q.strike), fmt(q.underlyingPrice), fmt(q.bid), fmt(q.ask), fmt(q.spreadPercent), position ? new Intl.NumberFormat('tr-TR').format(position.quantity) : '—', fmt(position?.invested ?? null), fmt(position?.remaining ?? null), fmt(position?.spreadLoss ?? null), fmt(q.marketMakerBid), fmt(q.marketMakerAsk)];
    values.forEach((value, i) => {
      const td = document.createElement('td'); td.textContent = value;
      if (i === 0) { const link=document.createElement('a'); link.href='/varant.html?symbol='+encodeURIComponent(q.symbol); link.textContent=q.symbol; td.textContent='';td.append(link); const small = document.createElement('small'); small.textContent = q.underlying; td.append(small); }
      if (i === 1) td.className = q.type.toLowerCase();
      tr.append(td);
    });
    tr.classList.add('clickable-row');
    tr.addEventListener('click',event=>{if(!event.target.closest('a'))location.href='/varant.html?symbol='+encodeURIComponent(q.symbol);});
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
el('amount').addEventListener('input', () => {
  page=1; render();
  const value=el('amount').valueAsNumber;
  if (Number.isFinite(value) && value>0 && value<=1e9) {try {localStorage.setItem('varantlab.amount',String(value));} catch {}}
});
el('sort').addEventListener('change', () => {page=1; render();});
el('refresh').addEventListener('click', load);
el('search').addEventListener('input', () => {page=1; render();});
el('type').addEventListener('change', () => {page=1; render();});
el('underlying').addEventListener('change', () => {page=1; render();});
el('prev').addEventListener('click', () => {page--; render();});
el('next').addEventListener('click', () => {page++; render();});
load();
