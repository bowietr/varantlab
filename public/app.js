import {calibrate,project} from './pricing.js';
import {gearing,daysToExpiry,sortQuotes} from './ranking.js';
import {calculatePosition} from './calculator.js';
const el = id => document.getElementById(id);
let quotes = [];
let modelCache=new Map();
const modelFor=q=>{if(!modelCache.has(q.symbol))modelCache.set(q.symbol,calibrate(q));return modelCache.get(q.symbol);};
const scenarioOptions=()=>({amount:el('amount').valueAsNumber,movePercent:el('scenarioMove').valueAsNumber,hours:el('scenarioHours').valueAsNumber,ivShiftPoints:el('scenarioIV').valueAsNumber,commissionPermille:el('scenarioFee').valueAsNumber});
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
  const mode=el('sort').value;
  const ranking = ['spread','gearing','scenario'].includes(mode);
  const comparable = !!el('underlying').value && !!el('type').value;
  const notes={
    symbol:'',
    scenario:'Sıralama: girdiğiniz hedef hareket gerçekleşirse tahmini net getiri yüzdesi. Kazanma olasılığı veya kesin getiri değildir; model kalibre edilemeyen ürünler dışlanır.',
    dailyDesc:'Kaynağın gerçekleşmiş günlük değişimi, yüksekten düşüğe. Gelecekteki getiri tahmini değildir.',
    dailyAsc:'Kaynağın gerçekleşmiş günlük değişimi, düşükten yükseğe. Düşen ürünün toparlanacağı anlamına gelmez.',
    expiryAsc:'Vadeye kalan takvim günü, azdan çoğa. Yakın vade daha avantajlı anlamına gelmez.',
    expiryDesc:'Vadeye kalan takvim günü, çoktan aza. Daha uzak vade tek başına düşük risk garantisi değildir.',
    spread:'Aynı dayanak ve yönde, bütçeye uygun geçerli kotasyonlar makas yüzdesine göre sıralanır. Kazanma olasılığı puanı değildir.',
    gearing:'Basit kaldıraç = dayanak fiyatı × çarpan / satış fiyatı. Yalnızca tanımlı TL dayanaklarında hesaplanır. Delta içermediği için etkin kaldıraç, beklenen getiri veya gerçek fiyat hassasiyeti değildir. Yüksek değer düşük fiyatlı, derin zararda ve çok riskli ürünleri öne çıkarabilir. Vade ve makası birlikte kontrol edin.'
  };
  el('sortNote').textContent=ranking&&!comparable?'Karşılaştırma için aynı dayanak ve Alım/Satım türünü seçin.':notes[mode]||'';


  const term = el('search').value.toLocaleUpperCase('tr-TR').trim();
  let selected = quotes.filter(q => `${q.symbol} ${q.underlying}`.toLocaleUpperCase('tr-TR').includes(term) && (!el('type').value || q.type === el('type').value) && (!el('underlying').value || q.underlying === el('underlying').value));
  el('scenarioControls').hidden=mode!=='scenario';
  const scenarioMap=new Map();
  if(mode==='scenario') {
    const options=scenarioOptions();
    let excluded=0;
    const maxSpread=el('scenarioSpread').valueAsNumber,minDelta=el('scenarioDelta').valueAsNumber,minDays=el('scenarioDays').valueAsNumber;
    const validFilters=[maxSpread,minDelta,minDays].every(Number.isFinite)&&maxSpread>=0&&maxSpread<=100&&minDelta>=0&&minDelta<=1&&minDays>=1&&minDays<=3650;
    selected=comparable?selected.filter(q=>{
      const model=modelFor(q);
      if(!validFilters||!model.ok||Math.abs(model.delta)<minDelta||!Number.isFinite(q.spreadPercent)||q.spreadPercent>maxSpread||daysToExpiry(q.expiry)<minDays){excluded++;return false;}
      const result=project(q,model,options);
      if(!result.ok){excluded++;return false;}
      const adverse=project(q,modelFor(q),{...options,movePercent:-options.movePercent});
      scenarioMap.set(q.symbol,{...result,adverse:adverse.ok?adverse.returnPercent:null});return true;
    }).sort((a,b)=>scenarioMap.get(b.symbol).returnPercent-scenarioMap.get(a.symbol).returnPercent||a.symbol.localeCompare(b.symbol)):[];
    if(comparable)el('sortNote').textContent+=` ${excluded} ürün model/veri/filtre kontrolünde dışlandı. Pozitif sonuç yoksa model bu senaryoda kârlı aday bulmamıştır.`;
  } else selected=sortQuotes(selected,mode,{amount:validAmount?amount:NaN,underlying:el('underlying').value,type:el('type').value});
  const pages = Math.max(1, Math.ceil(selected.length / pageSize));
  page = Math.min(page, pages);
  el('pageInfo').textContent = `${selected.length} kayıt · Sayfa ${page} / ${pages}`;
  el('prev').disabled = page <= 1; el('next').disabled = page >= pages;
  el('rows').replaceChildren();
  for (const q of selected.slice((page-1)*pageSize, page*pageSize)) {
    const tr = document.createElement('tr');
    const scenario=scenarioMap.get(q.symbol);
    const position = scenario ? {quantity:scenario.quantity,invested:scenario.entryCost,remaining:amount-scenario.entryCost,spreadLoss:scenario.quantity*(q.ask-q.bid)} : validAmount ? calculatePosition(amount,q.bid,q.ask) : null;
    const values = [q.symbol, q.type === 'CALL' ? 'Alım' : 'Satım', q.expiry.split('-').reverse().join('.'), fmt(q.strike), fmt(q.underlyingPrice), fmt(q.bid), fmt(q.ask), fmt(q.spreadPercent), fmt(scenario?.returnPercent??null), fmt(scenario?.profit??null), fmt(scenario?.adverse??null), fmt(scenario?.sigmaPercent??null), fmt(scenario?.delta??null), fmt(q.changePercent), daysToExpiry(q.expiry) ?? '—', fmt(gearing(q)), position ? new Intl.NumberFormat('tr-TR').format(position.quantity) : '—', fmt(position?.invested ?? null), fmt(position?.remaining ?? null), fmt(position?.spreadLoss ?? null), fmt(q.marketMakerBid), fmt(q.marketMakerAsk)];
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
    quotes = data.quotes; modelCache=new Map();
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
for(const id of ['scenarioMove','scenarioHours','scenarioIV','scenarioFee','scenarioSpread','scenarioDelta','scenarioDays'])el(id).addEventListener('input',()=>{page=1;render();});
el('sort').addEventListener('change', () => {page=1; render();});
el('refresh').addEventListener('click', load);
el('search').addEventListener('input', () => {page=1; render();});
el('type').addEventListener('change', () => {page=1; render();});
el('underlying').addEventListener('change', () => {page=1; render();});
el('prev').addEventListener('click', () => {page--; render();});
el('next').addEventListener('click', () => {page++; render();});
load();
