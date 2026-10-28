import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculatePosition} from '../public/calculator.js';
test('Budget changes size and round-trip spread cost',()=>{
 const p=calculatePosition(1000,.98,1);assert.deepEqual(p,{quantity:1000,invested:1000,remaining:0,spreadLoss:1000*(1-.98),spreadPercent:(1-.98)*100});
 assert.equal(calculatePosition(2500,.98,1).quantity,2500);
 const small=calculatePosition(1000,2.9,3);assert.equal(small.quantity,333);assert.equal(small.invested,999);assert.equal(small.remaining,1);
});
test('Fractional prices and an unaffordable single unit',()=>{
 assert.equal(calculatePosition(.3,.09,.1).quantity,3);
 assert.equal(calculatePosition(.29,.01,.01).quantity,29);
 assert.equal(calculatePosition(1,2,3).quantity,0);
});
test('Invalid budgets and unavailable exits are not presented as zero-cost opportunities',()=>{
 for(const amount of [0,-1,NaN,Infinity,1e10]) assert.equal(calculatePosition(amount,.9,1),null);
 for(const ask of [0,null,NaN,-1]) assert.equal(calculatePosition(1000,.9,ask),null);
 for(const bid of [0,null,NaN,2]) assert.equal(calculatePosition(1000,bid,1).spreadLoss,null);
});
