import {gearing,daysToExpiry} from './ranking.js';
const cdf=x=>{
 const sign=x<0?-1:1,z=Math.abs(x)/Math.SQRT2,t=1/(1+.3275911*z);
 const erf=1-(((((1.061405429*t-1.453152027)*t+1.421413741)*t-.284496736)*t+.254829592)*t)*Math.exp(-z*z);
 return .5*(1+sign*erf);
};
export function blackScholes({spot,strike,time,rate,sigma,type,multiplier=1}) {
 if (![spot,strike,time,rate,sigma,multiplier].every(Number.isFinite)||spot<=0||strike<=0||multiplier<=0||time<0||sigma<=0||!['CALL','PUT'].includes(type))return null;
 if(time===0)return Math.max(0,type==='CALL'?spot-strike:strike-spot)*multiplier;
 const vol=sigma*Math.sqrt(time),d1=(Math.log(spot/strike)+(rate+.5*sigma*sigma)*time)/vol,d2=d1-vol,discount=Math.exp(-rate*time);
 return Math.max(0,type==='CALL'?spot*cdf(d1)-strike*discount*cdf(d2):strike*discount*cdf(-d2)-spot*cdf(-d1))*multiplier;
}
export function impliedVolatility(price,params) {
 if(!Number.isFinite(price)||price<=0)return null;
 let lo=.001,hi=5;
 const low=blackScholes({...params,sigma:lo}),high=blackScholes({...params,sigma:hi});
 if(low===null||high===null||price<=low+1e-7||price>=high-1e-7)return null;
 for(let i=0;i<90;i++){const mid=(lo+hi)/2,v=blackScholes({...params,sigma:mid});if(v<price)lo=mid;else hi=mid;}
 const sigma=(lo+hi)/2;
 // Near-zero vega makes calibration unstable at quoted-price precision.
 const vega=(blackScholes({...params,sigma:sigma+.0001})-blackScholes({...params,sigma:Math.max(.0001,sigma-.0001)}))/.0002;
 return vega>1e-6?sigma:null;
}
export function calibrate(q,now=Date.now()) {
 const fail=reason=>({ok:false,reason});
 if(gearing(q)===null)return fail('Desteklenmeyen dayanak veya fiyat birimi');
 if(!Number.isFinite(q.annualRate)||q.annualRate<0||q.annualRate>200)return fail('Faiz verisi eksik veya geçersiz');
 if(q.dividendValue!==0)return fail('Temettü uyarlaması doğrulanmadı');
 if(!Number.isFinite(q.bid)||!Number.isFinite(q.ask)||q.bid<=0||q.ask<q.bid)return fail('Geçerli çift taraflı kotasyon yok');
 const days=daysToExpiry(q.expiry,now);if(days===null||days<=0)return fail('Vade bitmiş veya son gün zamanlaması belirsiz');
 const params={spot:q.underlyingPrice,strike:q.strike,multiplier:q.multiplier,type:q.type,time:days/365,rate:Math.log1p(q.annualRate/100)};
 const midpoint=(q.bid+q.ask)/2, sigma=impliedVolatility(midpoint,params);
 if(sigma===null)return fail('Kotasyon model sınırları dışında veya oynaklık kalibrasyonu kararsız');
 const root=sigma*Math.sqrt(params.time),d1=(Math.log(params.spot/params.strike)+(params.rate+.5*sigma*sigma)*params.time)/root;
 const delta=q.type==='CALL'?cdf(d1):cdf(d1)-1;
 const gamma=Math.exp(-.5*d1*d1)/Math.sqrt(2*Math.PI)/(params.spot*root);
 return {ok:true,params,sigma,delta,gamma,effectiveLeverage:delta*params.spot*params.multiplier/q.ask,halfSpread:(q.ask-q.bid)/2,midpoint};
}
export function project(q,model,{amount,movePercent,hours=4,ivShiftPoints=0,commissionPermille=0}={}) {
 const fail=reason=>({ok:false,reason});
 if(!model?.ok)return fail(model?.reason||'Model yok');
 if(![amount,movePercent,hours,ivShiftPoints,commissionPermille].every(Number.isFinite)||amount<=0||amount>1e9||movePercent<=-100||Math.abs(movePercent)>50||hours<0||hours>24||Math.abs(ivShiftPoints)>100||commissionPermille<0||commissionPermille>100)return fail('Senaryo girdilerini kontrol edin');
 const sigma=model.sigma+ivShiftPoints/100;if(sigma<=0||sigma>5)return fail('Senaryo oynaklığı model aralığı dışında');
 const fee=commissionPermille/1000;
 const quantity=Math.floor((amount+1e-9)/(q.ask*(1+fee)));
 if(quantity<1)return fail('Tutar bir adet ve giriş komisyonu için yetersiz');
 const theoretical=blackScholes({...model.params,spot:model.params.spot*(1+movePercent/100),time:Math.max(0,model.params.time-hours/(365*24)),sigma});
 // The absolute spread is assumed unchanged; floor exit quote to a 0.01 TRY tick.
 const exitPrice=Math.max(0,Math.floor((theoretical-model.halfSpread+1e-9)*100)/100);
 const entryCost=quantity*q.ask*(1+fee),exitValue=quantity*exitPrice*(1-fee),profit=exitValue-entryCost;
 return {ok:true,quantity,entryCost,exitPrice,profit,returnPercent:profit/entryCost*100,sigmaPercent:model.sigma*100,delta:model.delta,effectiveLeverage:model.effectiveLeverage};
}
