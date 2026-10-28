import {blackScholes,calibrate,project} from './pricing.js';
export function buildPlan(q,{amount,riskBudget,entry,target,stop,hours,commissionPermille=0,now=Date.now()}={}) {
 const fail=reason=>({ok:false,reason});
 if(![amount,riskBudget,entry,target,stop,hours,commissionPermille].every(Number.isFinite)||amount<=0||amount>1e9||riskBudget<=0||entry<=0||target<=0||stop<=0||hours<=0||hours>24||commissionPermille<0||commissionPermille>100)return fail('Pozitif tutar, kayıp bütçesi ve fiyatlar girin; çıkış zamanı önümüzdeki 24 saat içinde olmalı.');
 if(q.type==='CALL'?!(stop<entry&&entry<target):!(target<entry&&entry<stop))return fail(q.type==='CALL'?'Yükseliş planında stop < giriş < hedef olmalı.':'Düşüş planında hedef < giriş < stop olmalı.');
 const model=calibrate(q,now);if(!model.ok)return fail(model.reason);
 if([entry,target,stop].some(p=>Math.abs(p/q.underlyingPrice-1)>.5))return fail('Fiyatlar mevcut dayanak fiyatından en fazla %50 uzaklıkta olmalı.');
 // Price an entry at the user's underlying trigger; this is a hypothetical fill.
 const theoretical=blackScholes({...model.params,spot:entry,sigma:model.sigma});
 const entryAsk=Math.ceil((theoretical+model.halfSpread-1e-9)*100)/100;
 const adjustedQuote={...q,underlyingPrice:entry,ask:entryAsk};
 const adjustedModel={...model,params:{...model.params,spot:entry}};
 const fee=commissionPermille/1000,unitCost=entryAsk*(1+fee);
 const options={amount:unitCost+1e-8,hours,commissionPermille};
 const targetOne=project(adjustedQuote,adjustedModel,{...options,movePercent:(target/entry-1)*100});
 const stopOne=project(adjustedQuote,adjustedModel,{...options,movePercent:(stop/entry-1)*100});
 const flatOne=project(adjustedQuote,adjustedModel,{...options,movePercent:0});
 if(!targetOne.ok||!stopOne.ok||!flatOne.ok)return fail('Bu fiyat aralığı için senaryo hesaplanamadı. Hedef/stop hareketini daraltın.');
 const lossPerUnit=-stopOne.profit;
 if(lossPerUnit<=0)return fail('Stop senaryosunda kayıp oluşmadığı için kayıp bütçesine göre adet hesaplanamadı.');
 const budgetQty=Math.floor((amount+1e-9)/unitCost),riskQty=Math.floor((riskBudget+1e-9)/lossPerUnit),quantity=Math.min(budgetQty,riskQty);
 if(quantity<1)return fail('Bütçe veya kayıp sınırı bir adet için yetersiz.');
 const scale=p=>({profit:p.profit*quantity,returnPercent:p.returnPercent,exitPrice:p.exitPrice});
 const entryCost=quantity*unitCost,stopLoss=lossPerUnit*quantity;
 return {ok:true,symbol:q.symbol,underlying:q.underlying,type:q.type,quantity,entryAsk,entryCost,remaining:amount-entryCost,riskBudget,stopLoss,target:scale(targetOne),flat:scale(flatOne),stop:scale(stopOne),rewardRisk:targetOne.profit>0?targetOne.profit/lossPerUnit:null,limitedBy:riskQty<budgetQty?'Kayıp bütçesi':'İşlem tutarı',entry,targetLevel:target,stopLevel:stop,hours,commissionPermille,plannedAt:new Date(now).toISOString()};
}
export function closePaperTrade(trade,exitPrice) {
 if(!trade?.plan?.ok||!Number.isFinite(exitPrice)||exitPrice<0)return null;
 const p=trade.plan,exitValue=p.quantity*exitPrice*(1-p.commissionPermille/1000);
 return {profit:exitValue-p.entryCost,returnPercent:(exitValue/p.entryCost-1)*100};
}
