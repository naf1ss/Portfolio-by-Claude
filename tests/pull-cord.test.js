const test = require('node:test');
const assert = require('node:assert/strict');
const PullCord = require('../js/pull-cord.js');

test('step: a released cord swings back and settles at rest', () => {
  let state = { x: 30, y: 20, vx: 0, vy: 0 };
  let crossedZero = false;
  for (let i = 0; i < 400; i += 1) {
    const next = PullCord.step(state, 1 / 60);
    if (Math.sign(next.x) !== Math.sign(state.x) && state.x !== 0) crossedZero = true;
    state = next;
  }
  assert.ok(crossedZero, 'it should overshoot (wobble) rather than creep back');
  assert.ok(Math.abs(state.x) < 0.2 && Math.abs(state.y) < 0.2, 'it should come to rest');
});

test('pulled: a long enough pull down or to the side switches the lights', () => {
  assert.equal(PullCord.pulled({ x: 0, y: PullCord.PULL_DOWN_PX }), true);
  assert.equal(PullCord.pulled({ x: -PullCord.PULL_SIDE_PX, y: 0 }), true);
  assert.equal(PullCord.pulled({ x: 10, y: 8 }), false);
  assert.equal(PullCord.pulled({ x: 0, y: -5 }), false);
});
