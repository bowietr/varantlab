import {test} from 'node:test';import assert from 'node:assert/strict';import {PERIODS,validHistory,periodReturn} from '../public/history.js';
const now=Date.UTC(2026,9,29,12);
test('Insufficient history never produces invented weekly/monthly returns',()=>{assert.equal(periodReturn([{time:now,price:1}],'week',now),null);assert.equal(periodReturn([{time:now-2*PERIODS.day,price:1},{time:now,price:2}],'month',now),null);});
test('Real period baseline produces expected change',()=>{const p=[{time:now-30*PERIODS.day,price:2},{time:now-7*PERIODS.day,price:4},{time:now,price:5}];assert.equal(periodReturn(p,'week',now),25);assert.equal(periodReturn(p,'month',now),150);});
test('Discard invalid, future and duplicate observations and sort timestamps',()=>{assert.deepEqual(validHistory([{time:now,price:1},{time:now,price:2},{time:now-1,price:3},{time:now,price:0},{time:now+1e7,price:9}],now),[{time:now-1,price:3},{time:now,price:2}]);});
