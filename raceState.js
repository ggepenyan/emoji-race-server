import { finishLanePosX, panicButtonDelimiter } from "./constants.js";

export const races = new Map();

export function makeRace(id) {
  if (!races.has(id)) {
    races.set(id, {
      id,
      players: {},
      startedAt: null,
      timeLeft: 10,
      finished: false,
      panicUsed: false,
      applyPanic: false,
    });
  }
  return races.get(id);
}

export function applyTapBurst(raceId, pid, d) {
  const race = races.get(raceId);
  if (!race || race.finished) return race;

  const player = race.players[pid];
  if (!player) return race;

  const delta = Math.min(d, 30);
  player.taps += delta;

  const newX   = Math.floor(player.taps / 5);
  if (newX > player.x) {
    player.x = Math.min(newX, 29);
  }
  validatePanic(race);
  if (player.x >= finishLanePosX) {
    finishRace(race, pid);
  }
  return race;
}

function validatePanic(race) {
  if (race.panicUsed) return;

  const players = Object.values(race.players);
  const allPlayersTaps = players.reduce((acc, player) => {
    return acc + player.taps;
  }, 0);

  if (allPlayersTaps >= players.length * panicButtonDelimiter) {
    race.applyPanic = true;
  }
}

export function applyPanic(raceId, pid) {
  const race = races.get(raceId);
  if (!race || race.panicUsed || race.finished) return null;

  const winner = race.players[pid];
  const pos = Math.max(0, winner.x - 1);
  Object.values(race.players).forEach(p => {
    if (p.id !== pid && p.x > 0) {
      p.x = Math.max(0, p.x - 2);
      p.taps -= p.taps >= 10 ? 10 : p.taps;
    }
  });
  race.panicUsed = true;
  race.applyPanic = false;
  return { race, obstacle: { type: 'oilSpill', pos } };
}

export function finishRace(race, winnerId) {
  if (race.finished) return;
  race.finished  = true;
  race.winnerId  = winnerId;
}
