import {test} from 'node:test';import assert from 'node:assert/strict';import {gearing,daysToExpiry,sortQuotes} from '../public/ranking.js';
const now=Date.UTC(2026,9,29,12), q={symbol:'AAAAA.V',underlying:'AKBNK',type:'CALL',underlyingPrice:60,multiplier:.2,bid:.98,ask:1,expiry:'2026-11-12',changePercent:10};
test('Gearing uses conversion multiplier and rejects unknown currency underlyings',()=>{assert.equal(gearing(q),12);assert.equal(gearing({...q,underlying:'APPLE'}),null);assert.equal(gearing({...q,ask:0}),null);});
test('Potential proxy requires comparable products, budget and non-expired valid quotes',()=>{
 const options={amount:1000,underlying:'AKBNK',type:'CALL',now};const cheap={...q,symbol:'BBBBB.V',bid:.49,ask:.5};
 assert.equal(sortQuotes([q,cheap],'gearing',options)[0].symbol,'BBBBB.V');
 assert.equal(sortQuotes([q],'gearing',{amount:1000}).length,0);
 for(const invalid of [{...q,bid:0},{...q,expiry:'2026-10-28'},{...q,type:'PUT'},{...q,ask:1001}])assert.equal(sortQuotes([invalid],'gearing',options).length,0);
});
test('Daily rankings keep missing values last and expiry uses Turkey calendar',()=>{
 const rows=[q,{...q,symbol:'BBBBB.V',changePercent:-2},{...q,symbol:'CCCCC.V',changePercent:null}];
 assert.deepEqual(sortQuotes(rows,'dailyDesc').map(q=>q.symbol),['AAAAA.V','BBBBB.V','CCCCC.V']);
 assert.equal(sortQuotes(rows,'dailyAsc')[0].symbol,'BBBBB.V');
 assert.equal(daysToExpiry('2026-10-30',Date.UTC(2026,9,28,22)),1);
});
