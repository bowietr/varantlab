import {test} from 'node:test';import assert from 'node:assert/strict';import {blackScholes,impliedVolatility,calibrate,project} from '../public/pricing.js';
const p={spot:100,strike:100,time:1,rate:.05,sigma:.2,type:'CALL'};
const close=(a,b,tol=1e-4)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('Black Scholes known benchmark and call-put parity',()=>{
 close(blackScholes(p),10.45058357);const put=blackScholes({...p,type:'PUT'});close(put,5.57352602);
 close(blackScholes(p)-put,100-100*Math.exp(-.05));close(blackScholes({...p,multiplier:.2}),blackScholes(p)*.2);
 assert.equal(blackScholes({...p,time:0,spot:110}),10);
});
test('IV inversion recovers input and rejects impossible price',()=>{
 close(impliedVolatility(blackScholes(p),p),.2,1e-7);assert.equal(impliedVolatility(200,p),null);
});
const now=Date.UTC(2026,9,29,12);
const q={symbol:'AAAAA.V',underlying:'AKBNK',type:'CALL',underlyingPrice:100,strike:100,multiplier:.1,expiry:'2027-10-29',annualRate:(Math.exp(.05)-1)*100,dividendValue:0,bid:1.04,ask:1.06};
test('Unchanged scenario pays observed spread and commissions; budget includes entry fee',()=>{
 const model=calibrate(q,now);assert.equal(model.ok,true);
 const result=project(q,model,{amount:1000,movePercent:0,hours:0,commissionPermille:0});
 assert.equal(result.exitPrice,q.bid);assert.ok(result.profit<0);assert.ok(result.entryCost<=1000+1e-8);
 const fee=project(q,model,{amount:1000,movePercent:0,hours:0,commissionPermille:2});assert.ok(fee.returnPercent<result.returnPercent);assert.ok(fee.entryCost<=1000+1e-8);
});
test('Call and put respond in opposite directions; volatility and holding time enter repricing',()=>{
 const m=calibrate(q,now);const options={amount:1000,movePercent:2,hours:0};
 assert.ok(project(q,m,options).profit>project(q,m,{...options,movePercent:-2}).profit);
 const put={...q,type:'PUT',bid:.55,ask:.57};const pm=calibrate(put,now);assert.ok(pm.ok);
 assert.ok(project(put,pm,{...options,movePercent:-2}).profit>project(put,pm,options).profit);
 assert.ok(project(q,m,{...options,ivShiftPoints:5}).profit>project(q,m,options).profit);
 assert.ok(project(q,m,{...options,hours:24}).profit<=project(q,m,options).profit);
});
test('Unsupported currencies, dividends, missing rate, expired warrants and invalid inputs are excluded',()=>{
 for(const row of [{...q,underlying:'APPLE'},{...q,annualRate:null},{...q,dividendValue:1},{...q,expiry:'2026-10-29'},{...q,bid:0}])assert.equal(calibrate(row,now).ok,false);
 const m=calibrate(q,now);for(const movePercent of [-100,NaN,60])assert.equal(project(q,m,{amount:1000,movePercent}).ok,false);
});
