const test = require('node:test');
const assert = require('node:assert/strict');
const { streakDays } = require('../js/contact-utils.js');

test('streakDays counts the first day as day 1 and adds one each calendar day', () => {
  assert.equal(streakDays('2025-07-19', new Date(2025, 6, 19, 0, 1)), 1);
  assert.equal(streakDays('2025-07-19', new Date(2025, 6, 19, 23, 59)), 1);
  assert.equal(streakDays('2025-07-19', new Date(2025, 6, 20, 0, 1)), 2);
  assert.equal(streakDays('2025-07-19', new Date(2026, 10, 14, 22, 50)), 484, 'the streak on 14 Nov 2026');
});

test('streakDays is whole days across clock changes and leap years', () => {
  assert.equal(streakDays('2026-03-01', new Date(2026, 2, 31, 12)), 31); // US clocks change on 8 Mar 2026
  assert.equal(streakDays('2028-02-28', new Date(2028, 2, 1, 12)), 3); // 2028 has 29 Feb
});

test('streakDays shows nothing before the streak starts or without a readable date', () => {
  assert.equal(streakDays('2025-07-19', new Date(2025, 6, 18, 12)), null);
  assert.equal(streakDays(null), null);
  assert.equal(streakDays('19 July 2025'), null);
});
