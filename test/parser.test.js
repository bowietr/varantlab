import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseQuotes} from '../src/parser.js';
const sample = {dayanak:'AKBNK',varant:'AB1KVV',tur:'C',vadeTarihi:'30.10.2026',carpan:.2,kullanimFiyati:100,alis:.01,satis:.02,pyAlis:.01,pySatis:.04,dayanakValue:'1.063,00',yuzde:-2,sonFiyat:.015};
function html(rows) {
 const text=JSON.stringify({csvData:rows});const at=Math.floor(text.length/2);
 return [text.slice(0,at),text.slice(at)].map(part=>`<script nonce="test">self.__next_f.push(${JSON.stringify([1,part])})</script>`).join('');
}
test('Read all records across script chunks, preserving quote types and Turkish decimals',()=>{
 const rows=Array.from({length:105},(_,i)=>({...sample,varant:`A${String(i).padStart(4,'0')}V`,tur:i%2?'P':'C'}));
 const q=parseQuotes(html(rows));assert.equal(q.length,105);assert.equal(q[104].symbol,'A0104.V');
 assert.equal(q[1].type,'PUT');assert.equal(q[0].underlyingPrice,1063);assert.equal(q[0].spreadPercent,50);assert.equal(q[0].marketMakerAsk,.04);assert.equal(q[0].quoteTime,null);assert.equal(q[0].lastPrice,.015);
});
test('Missing full list or changed schema fails without silently returning only ten rows',()=>{
 for(const source of ['<table><tr></tr></table>',html([]),html([{...sample,tur:'X'}]),html([sample,sample])]) assert.throws(()=>parseQuotes(source));
});
test('Missing or crossed prices retain product without generating a false spread',()=>{
 for(const row of [{...sample,alis:null},{...sample,alis:.09},{...sample,satis:0}]) {
 const [q]=parseQuotes(html([row]));assert.equal(q.quoteAvailable,false);assert.equal(q.spreadPercent,null);
 }
});
