import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from './helpers/spin-doctor-harness.mjs';

const traces = JSON.parse(readFileSync(new URL('./fixtures/spin-doctor-playthroughs.json', import.meta.url), 'utf8'));

// Use only normal key handlers, RAF time and the visible Next Stage button.
// Never modify a pin, angle, enemy, timer, save, health or clear status.
// This recorded input trace uses a 60 Hz clock. Rotation/enemy frame-rate
// independence is covered separately in spin-doctor.test.mjs.
test('all 15 stages clear sequentially from a new save at 60 Hz', () => {
    const game = createGame();
    assert.equal(game.storage.has('spindoctor_save_v1'), false);
    for (const trace of traces) {
      assert.equal(game.state().stage.stageNumber, trace.stage);
      assert.equal(game.state().pivotPinId, game.state().stage.startPinId);
      assert.equal(game.state().elapsedTime, 0);
      let frame = 0;
      for (const input of trace.inputs) {
        assert.ok(['Space', 'KeyS', 'KeyW'].includes(input.code), 'Only latch, flip and turbo are allowed');
        const nextFrame = input.frame;
        if (nextFrame > frame) game.advance((nextFrame - frame) / 60, 60);
        assert.equal(game.state().status, 'playing', `Stage ${trace.stage}: alive before ${input.code} at ${input.frame}`);
        game.key(input.code);
        if (input.code !== 'KeyW') game.emit('keyup', { code: input.code });
        frame = nextFrame;
      }
      assert.equal(game.state().status, 'cleared', `Stage ${trace.stage}: normal inputs reach the goal`);
      assert.equal(game.state().pins.find(pin => pin.id === game.state().pivotPinId).type, 'goal');
      assert.ok(game.text().includes('STAGE CLEAR!'));
      const save = JSON.parse(game.storage.get('spindoctor_save_v1'));
      assert.equal(Object.keys(save.records).length, trace.stage);
      assert.equal(save.records[trace.stage].cleared, true);
      assert.equal(save.records[trace.stage].highScore, game.state().score);
      assert.ok(game.state().timeRemaining > 0);
      if (trace.stage < 15) {
        assert.equal(game.button('次のステージ').props.disabled, undefined);
        game.click('次のステージ');
      }
    }
    assert.equal(Object.keys(JSON.parse(game.storage.get('spindoctor_save_v1')).records).length, 15);
});
