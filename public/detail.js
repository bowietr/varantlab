import {gearing,daysToExpiry} from './ranking.js';
import {PERIODS,validHistory,periodReturn} from './history.js';
const el=id=>document.getElementById(id);
const symbol=new URLSearchParams(location.search).get('symbol')?.toUpperCase();
const validSymbol=/^[A-Z0-9]{5}\.V$/.test(symbol||'');
const key=`varantlab.history.${symbol}`;
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('tr-TR',{maximumFractionDigits:3}).format(n):'—';
const percent=n=>Number.isFinite(n)?`${n>0?'+':''}${fmt(n)}%`:'—';
const date=t=>new Date(t).toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'});
let points=[],period='day',storageOK=true;
try {points=validHistory(JSON.parse(localStorage.getItem(key)||'[]'));} catch {storageOK=false;}
function chart() {
 const now=Date.now(),cutoff=now-PERIODS[period];
 const visible=points.filter(p=>p.time>=cutoff);
 const container=el('chart');container.replaceChildren();
 el('observations').replaceChildren();
 el('weekly').textContent=percent(periodReturn(points,'week',now));
 el('monthly').textContent=percent(periodReturn(points,'month',now));
 el('weekNote').textContent=periodReturn(points,'week',now)===null?'7 gün öncesine ait gözlem yok':'Kaydedilen son fiyatlara göre';
 el('monthNote').textContent=periodReturn(points,'month',now)===null?'30 gün öncesine ait gözlem yok':'Kaydedilen son fiyatlara göre';
 const mode=el('chartMode').value,first=visible[0]?.price;
 for(const p of visible.slice(-20).reverse()) {
  const tr=document.createElement('tr');
  [date(p.time),fmt(p.price),percent((p.price/first-1)*100)].forEach(value=>{const td=document.createElement('td');td.textContent=value;tr.append(td);});
  el('observations').append(tr);
 }
 el('chartNote').textContent=`${visible.length} gerçek gözlem · Tabloda son 20 gözlem. ${storageOK?'Kayıtlar bu tarayıcıya özeldir.':'Tarayıcı depolaması kullanılamıyor; kayıtlar kalıcı tutulamıyor.'}`;
 if(visible.length<2) {
  const p=document.createElement('p');p.className='chart-empty';p.textContent=visible.length?'İlk gerçek gözlem kaydedildi. Çizgi grafik için farklı bir zamanda alınmış en az iki gözlem gerekiyor.':'Bu döneme ait gerçek geçmiş gözlem bulunmuyor.';container.append(p);return;
 }
 const values=visible.map(p=>mode==='price'?p.price:(p.price/first-1)*100);
 let min=Math.min(...values),max=Math.max(...values);const pad=Math.max((max-min)*.1,mode==='price'?.001:.1);min-=pad;max+=pad;
 const start=visible[0].time,end=visible.at(-1).time;
 const coords=visible.map((p,i)=>[70+(p.time-start)/(end-start)*770,240-(values[i]-min)/(max-min)*210]);
 const ns='http://www.w3.org/2000/svg';const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 880 290');svg.setAttribute('aria-label',mode==='price'?'Kaydedilen son fiyatlar':'İlk gözleme göre yüzdesel fiyat değişimi');
 function add(tag,attrs,text){const node=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);if(text)node.textContent=text;svg.append(node);return node;}
 for(let i=0;i<4;i++){const y=30+i*70;add('line',{x1:70,x2:840,y1:y,y2:y,stroke:'#304537'});add('text',{x:62,y:y+4,'text-anchor':'end',fill:'#adc0b2','font-size':12},fmt(max-i*(max-min)/3)+(mode==='return'?'%':''));}
 add('polyline',{points:coords.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#b6ec8a','stroke-width':2.5});
 for(let i=0;i<coords.length;i++){const [cx,cy]=coords[i];const dot=add('circle',{cx,cy,r:3,fill:'#b6ec8a'});const title=document.createElementNS(ns,'title');title.textContent=`${date(visible[i].time)} · ${fmt(values[i])}${mode==='return'?'%':' TL'}`;dot.append(title);}
 add('text',{x:70,y:278,fill:'#adc0b2','font-size':11},date(start));add('text',{x:840,y:278,'text-anchor':'end',fill:'#adc0b2','font-size':11},date(end));container.append(svg);
}
async function load() {
 if(!validSymbol){el('symbol').textContent='Geçersiz varant kodu';el('detailStatus').textContent='Listeye dönerek bir varant seçin.';el('detailRefresh').disabled=true;return;}
 el('planLink').href='/plan.html?symbol='+encodeURIComponent(symbol);el('symbol').textContent=symbol;document.title=`${symbol} · VarantLab`;
 el('detailRefresh').disabled=true;el('detailError').hidden=true;
 try {
  const response=await fetch('/api/quotes',{signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Veri alınamadı.');
  const q=data.quotes.find(q=>q.symbol===symbol);if(!q)throw new Error('Bu varant güncel kaynak listesinde bulunamadı. Vadesi dolmuş veya listeden çıkarılmış olabilir.');
  el('subtitle').textContent=`${q.underlying} · ${q.type==='CALL'?'Alım':'Satım'} varantı`;
  el('facts').replaceChildren();
  const facts=[['Son fiyat',fmt(q.lastPrice)+' TL'],['Kalan takvim günü',String(daysToExpiry(q.expiry)??'—')],['Basit kaldıraç · delta hariç',fmt(gearing(q))],['Alış',fmt(q.bid)+' TL'],['Satış',fmt(q.ask)+' TL'],['Makas',percent(q.spreadPercent)],['Dayanak fiyatı',fmt(q.underlyingPrice)+' (kaynak birimi)'],['Kullanım fiyatı',fmt(q.strike)],['Vade',q.expiry.split('-').reverse().join('.')],['Çarpan',fmt(q.multiplier)],['P.Y. alış',fmt(q.marketMakerBid)+' TL'],['P.Y. satış',fmt(q.marketMakerAsk)+' TL']];
  for(const [label,value]of facts){const card=document.createElement('article'),span=document.createElement('span'),strong=document.createElement('strong');span.textContent=label;strong.textContent=value;card.append(span,strong);el('facts').append(card);}
  el('daily').textContent=percent(q.changePercent);
  const time=Date.parse(data.fetchedAt);if(Number.isFinite(time)&&Number.isFinite(q.lastPrice)&&q.lastPrice>0){points=validHistory([...points,{time,price:q.lastPrice}]);try{localStorage.setItem(key,JSON.stringify(points));}catch{storageOK=false;}}
  el('detailStatus').textContent='Gerçek kaynak verisi alındı · 15 dakika gecikmeli';
  el('detailMeta').textContent=`Verinin alındığı zaman: ${date(time)} · Fiyatın işlem zamanı doğrulanmadı.`;
 }catch(error){el('facts').replaceChildren();el('daily').textContent='—';el('detailError').textContent=error.message;el('detailError').hidden=false;el('detailStatus').textContent='Güncel veri alınamadı. Grafik varsa önceki kayıtları gösterir.';}finally{el('detailRefresh').disabled=false;chart();}
}
for(const button of document.querySelectorAll('[data-period]'))button.addEventListener('click',()=>{period=button.dataset.period;document.querySelectorAll('[data-period]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));chart();});
el('chartMode').addEventListener('change',chart);el('detailRefresh').addEventListener('click',load);
setInterval(()=>{if(!document.hidden)load();},300000);
load();
