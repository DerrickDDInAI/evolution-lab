import {digest} from './domain.mjs';

export const TRAIN_KINDS = ['stationary', 'line', 'turn', 'stop-go'];
export const HOLDOUT_KINDS = [...TRAIN_KINDS, 'zigzag', 'evade'];
export const DT = 1 / 30;

// Scenario RNG is independent of evolutionary RNG and identical for all arms.
export function scenarios(seed, split, seconds, random) {
  const rng = {seed}, rows = [];
  for (const [index, kind] of (split === 'train' ? TRAIN_KINDS : HOLDOUT_KINDS).entries()) {
    const angle = random(rng) * Math.PI * 2;
    const gap = 240 + random(rng) * 180;
    const turn = .6 + random(rng) * .5;
    const offset = random(rng) * .8;
    // Diametrically mirrored starts balance direction within each opponent type.
    for (const mirror of [0, 1]) {
      const heading = angle + mirror * Math.PI;
      const x = Math.cos(heading), y = Math.sin(heading);
      rows.push({id:`${split}-${kind}-${mirror}`, split, kind, seconds, heading, turn, offset,
        player:{x:3000, y:3000}, bot:{x:3000 - x * gap, y:3000 - y * gap},
        obstacles:index % 2 ? [{x:3000 - x * gap / 2 - y * 50,
          y:3000 - y * gap / 2 + x * 50, r:42}] : []});
    }
  }
  return rows;
}

export function command(scenario, time, player, bot) {
  const {kind, heading, turn, offset} = scenario;
  if (kind === 'stationary' || (kind === 'stop-go' && Math.floor((time + offset) / 1.5) % 2 === 0)) {
    return {x:0, y:0, dash:false};
  }
  let angle = heading;
  if (kind === 'turn' || kind === 'stop-go') angle += time * turn;
  if (kind === 'zigzag') angle += Math.sin(time * 2.7 + offset) * 1.35;
  if (kind === 'evade') angle = Math.atan2(player.y - bot.y, player.x - bot.x) + Math.sin(time * turn) * .5;
  if (kind === 'reverse') angle += Math.floor((time + offset) / 1.8) % 2 * Math.PI;
  if (kind === 'orbit' || kind === 'figure-eight') {
    const t = time * turn + offset, center = scenario.player;
    const localX = Math.cos(t) * 220;
    const localY = (kind === 'orbit' ? Math.sin(t) : Math.sin(t * 2) * .7) * 220;
    const targetX = center.x + Math.cos(heading) * localX - Math.sin(heading) * localY;
    const targetY = center.y + Math.sin(heading) * localX + Math.cos(heading) * localY;
    angle = Math.atan2(targetY - player.y, targetX - player.x);
  }
  return {x:Math.cos(angle), y:Math.sin(angle),
    dash:(kind === 'evade' && time % 3 < .7) || (kind === 'burst' && (time + offset) % 3 < 1)};
}

export function prepareSuite(domain, mode, rows) {
  return rows.map(scenario => {
    const arena = domain.arena.createArena(0, mode);
    arena.obstacles = structuredClone(scenario.obstacles);
    arena.bots = [arena.bots[0]];
    Object.assign(arena.bots[0], scenario.bot, {vx:0, vy:0, spawnWait:0});
    const p = domain.arena.join(arena, 'synthetic', 'unused', 'Synthetic', 0);
    Object.assign(p, scenario.player, {phase:'arena', runStartedAt:0, runId:'synthetic-run'});
    return {scenario, arena};
  });
}

export function episode(domain, genome, fixture) {
  const {scenario} = fixture, arena = structuredClone(fixture.arena);
  const bot = arena.bots[0], player = arena.players[0];
  bot.genome = genome;
  const steps = Math.round(scenario.seconds / DT);
  let elapsed = 0;
  for (let step = 1; step <= steps; step++) {
    elapsed = step * DT;
    const now = elapsed * 1000;
    player.lastSeen = now;
    domain.physics.movePlayer(player, command(scenario, elapsed - DT, player, bot), DT, arena.obstacles, now);
    domain.arena.advance(arena, now);
    if (player.phase !== 'arena') break;
  }
  if (arena.generation !== 1) throw new Error('Episode crossed a breeding boundary');
  if (!Number.isFinite(bot.fitness)) throw new Error('Non-finite evaluation fitness');
  const captured = player.lastDeath !== null;
  const d = arena.detection;
  return {id:scenario.id, kind:scenario.kind, fitness:bot.fitness, captured,
    rewardedCapture:captured && bot.tags > 0, stationaryCapture:captured && arena.mode === 'motion' && bot.tags === 0,
    captureSeconds:captured ? elapsed : null, cappedCaptureSeconds:captured ? elapsed : scenario.seconds,
    simulatedSeconds:elapsed,
    detection:d ? {tp:d.truePositive, tn:d.trueNegative, fp:d.falsePositive, fn:d.falseNegative} : null};
}

const ratio = (a, b) => b ? a / b : null;
export function summarizeEpisodes(rows) {
  const total = key => rows.reduce((sum, row) => sum + Number(row[key]), 0);
  const captured = rows.filter(r => r.captured);
  const detection = rows.some(r => r.detection) ? rows.reduce((sum, row) => {
    for (const k of ['tp', 'tn', 'fp', 'fn']) sum[k] += row.detection?.[k] || 0;
    return sum;
  }, {tp:0, tn:0, fp:0, fn:0}) : null;
  return {episodes:rows.length, fitness:total('fitness') / rows.length,
    captureRate:total('captured') / rows.length, rewardedCaptureRate:total('rewardedCapture') / rows.length,
    stationaryCaptureRate:total('stationaryCapture') / rows.length,
    captureSeconds:captured.length ? captured.reduce((sum, r) => sum + r.captureSeconds, 0) / captured.length : null,
    cappedCaptureSeconds:total('cappedCaptureSeconds') / rows.length,
    simulatedSeconds:total('simulatedSeconds'), detection,
    movingRecall:detection ? ratio(detection.tp, detection.tp + detection.fn) : null,
    stationaryFalsePositiveRate:detection ? ratio(detection.fp, detection.fp + detection.tn) : null,
    balancedAccuracy:detection && detection.tp + detection.fn && detection.tn + detection.fp
      ? (ratio(detection.tp, detection.tp + detection.fn) + ratio(detection.tn, detection.tn + detection.fp)) / 2 : null};
}

export function evaluate(domain, genome, suite, details = false) {
  const rows = suite.map(fixture => episode(domain, genome, fixture));
  const result = summarizeEpisodes(rows);
  if (details) {
    result.byOpponent = Object.fromEntries([...new Set(rows.map(r => r.kind))]
      .map(kind => [kind, summarizeEpisodes(rows.filter(r => r.kind === kind))]));
    result.rows = rows;
  }
  return result;
}

export const suiteHash = rows => digest(JSON.stringify(rows));
