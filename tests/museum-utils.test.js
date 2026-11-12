const test = require('node:test');
const assert = require('node:assert/strict');
const { TIMELINE, PLAN, smoothstep, fieldOfView, distanceToFit, arrival, cameraKeys, segmentAt, curtainPoint } = require('../js/museum-utils.js');

const WIDE = 16 / 9;
const TALL = 390 / 844;
const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-9, message || `${actual} is not ${expected}`);

test('smoothstep eases from 0 to 1 and holds outside the range', () => {
  assert.equal(smoothstep(0.2, 0.6, 0.1), 0);
  assert.equal(smoothstep(0.2, 0.6, 0.9), 1);
  close(smoothstep(0.2, 0.6, 0.4), 0.5);
  assert.ok(smoothstep(0.2, 0.6, 0.3) < 0.25, 'starts slowly');
});

test('the timeline runs in order: word, doors, threshold, curtains, arrival', () => {
  const order = [
    TIMELINE.squareBy, TIMELINE.paperGone, TIMELINE.wordLands, TIMELINE.setOff, TIMELINE.wordHandedOver,
    TIMELINE.doors[0], TIMELINE.doors[1], TIMELINE.inside[1], TIMELINE.curtains[0], TIMELINE.curtains[1],
  ];
  order.forEach((time, i) => i && assert.ok(time >= order[i - 1], `step ${i} comes after step ${i - 1}`));
  assert.ok(TIMELINE.curtains[1] <= TIMELINE.arrive && TIMELINE.arrive < 1);
});

test('a tall screen gets a wider field of view than a wide one', () => {
  assert.ok(fieldOfView(TALL) > fieldOfView(WIDE));
});

test('distanceToFit stands far enough back for both the width and the height', () => {
  const half = Math.tan((40 * Math.PI) / 360);
  const distance = distanceToFit({ width: 30, height: 10, fovDeg: 40, aspect: WIDE, margin: 1 });
  assert.ok(2 * distance * half * WIDE >= 30 - 1e-9, 'the width fits');
  assert.ok(2 * distance * half >= 10 - 1e-9, 'the height fits');
  assert.ok(distanceToFit({ width: 30, height: 10, fovDeg: 40, aspect: TALL }) > distance, 'a narrow screen stands further back');
});

for (const [name, aspect] of [['wide', WIDE], ['tall', TALL]]) {
  test(`camera stops on a ${name} screen: in time order, walking steadily into the building`, () => {
    const keys = cameraKeys(aspect);
    keys.forEach((key, i) => {
      if (!i) return;
      assert.ok(key.t > keys[i - 1].t, 'times increase');
      assert.ok(key.position[2] < keys[i - 1].position[2], 'each stop is further in');
    });
    assert.equal(keys[0].t, TIMELINE.setOff);
    assert.equal(keys.at(-1).t, 1);
  });

  test(`camera on a ${name} screen: starts with the whole façade in view, ends seeing only the wall`, () => {
    const keys = cameraKeys(aspect);
    const half = Math.tan((fieldOfView(aspect) * Math.PI) / 360);
    const start = keys[0].position[2];
    assert.ok(2 * start * half * aspect >= PLAN.steps.width, 'the steps fit across');
    const [, level] = keys[0].position;
    assert.equal(level, keys[0].look[1], 'the first view is level');
    assert.ok(level + start * half >= PLAN.top, 'the roof is in view');
    assert.ok(level - start * half <= 0, 'and so is the ground');

    const end = arrival(aspect);
    const last = keys.at(-1);
    assert.ok(Math.abs(last.position[2] - (PLAN.foyer.back + end.distance)) < 1e-9);
    assert.ok(end.distance * half < PLAN.eye, 'the floor is below the view');
    assert.ok(end.visibleWidth < PLAN.foyer.halfWidth * 2, 'the side walls are outside the view');
    assert.equal(last.position[1], last.look[1], 'it faces the wall squarely');
  });

  test(`camera on a ${name} screen: passes the doors only after they have opened`, () => {
    const keys = cameraKeys(aspect);
    const after = keys.findIndex((key) => key.position[2] < PLAN.wall.z);
    const before = keys[after - 1];
    const share = (before.position[2] - PLAN.wall.z) / (before.position[2] - keys[after].position[2]);
    const crossing = before.t + share * (keys[after].t - before.t);
    assert.ok(crossing > TIMELINE.doors[1], `crosses at ${crossing.toFixed(3)}, doors open by ${TIMELINE.doors[1]}`);
  });
}

test('segmentAt finds the stretch a time falls in, and holds at the ends', () => {
  const times = [0.1, 0.2, 0.5, 1];
  assert.deepEqual(segmentAt(times, 0), { index: 0, share: 0 });
  assert.deepEqual(segmentAt(times, 0.1), { index: 0, share: 0 });
  assert.equal(segmentAt(times, 0.35).index, 1);
  close(segmentAt(times, 0.35).share, 0.5);
  assert.deepEqual(segmentAt(times, 0.5), { index: 2, share: 0 });
  assert.deepEqual(segmentAt(times, 1), { index: 2, share: 1 });
  assert.deepEqual(segmentAt(times, 2), { index: 2, share: 1 });
});

test('a closed curtain spans its width; an open one is gathered at the side', () => {
  const { width, gathered } = PLAN.curtain;
  assert.equal(curtainPoint(0, 0, 0).x, 0, 'the outer edge is fixed');
  assert.equal(curtainPoint(1, 0, 0).x, width);
  assert.equal(curtainPoint(1, 1, 0).x, width, 'closed, the hem hangs straight');
  assert.ok(Math.abs(curtainPoint(1, 0, 1).x - gathered) < 1e-9);
  assert.ok(Math.abs(curtainPoint(1, 1, 1).x - gathered) < 1e-9);
});

test('a curtain opens steadily, its hem trailing the rail, and its folds deepen as it gathers', () => {
  let previous = Infinity;
  for (let open = 0; open <= 1.0001; open += 0.05) {
    const x = curtainPoint(1, 0, open).x;
    assert.ok(x <= previous + 1e-9, 'the free edge only moves aside');
    previous = x;
  }
  assert.ok(curtainPoint(1, 1, 0.5).x > curtainPoint(1, 0, 0.5).x, 'half open, the hem lags behind');
  const deepest = (open) => Math.max(...Array.from({ length: 200 }, (_, i) => Math.abs(curtainPoint(i / 199, 0.5, open).z)));
  assert.ok(deepest(1) > deepest(0) * 2);
});

test('two closed curtains meet in the middle of the opening and cover it', () => {
  assert.ok(PLAN.curtain.width * 2 >= PLAN.proscenium.width, 'together they are as wide as the opening');
  assert.ok(PLAN.curtain.height >= PLAN.proscenium.height, 'and as tall');
  assert.ok(PLAN.curtain.z < PLAN.proscenium.z, 'they hang behind it');
});
