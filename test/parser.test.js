import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseQuotes} from '../src/parser.js';
const row = (bid='0,01', ask='0,02') => `<table><tr>${['AB1KV.V AKBNK Alım Varantı','','','30/10/26','0,2','1.000,00','63,00','0,01','0,04','0,00',bid,ask,'AKBNK','+'].map(x=>`<td>${x}</td>`).join('')}</tr></table>`;
test('Turkish decimals, empty presentation cells and distinct quote fields', () => {
  const [q] = parseQuotes(row());
  assert.equal(q.symbol,'AB1KV.V'); assert.equal(q.strike,1000); assert.equal(q.multiplier,.2);
  assert.equal(q.ask,.02); assert.equal(q.marketMakerAsk,.04); assert.equal(q.spreadPercent,50);
  assert.equal(q.expiry,'2026-10-30'); assert.equal(q.quoteTime,null);
});
test('Reject missing, malformed and crossed quotes instead of showing invented data', () => {
  for (const html of ['<html>Unavailable</html>',row('—'),row('0,05','0,02')]) assert.throws(()=>parseQuotes(html));
});
