import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { makeRace, applyTapBurst, applyPanic, races } from './raceState.js';
import { log } from 'console';

const app = express();
app.use(express.json());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.post('/createRace', (_, res) => {
  const id = nanoid(4).toUpperCase();
  io.to(id);
  makeRace(id);
  res.json({ id });
});

io.on('connection', (socket) => {
  socket.on('joinRace', async({ raceId, emoji }) => {
    const race = makeRace(raceId, socket.id);
    race.players[socket.id] = { id: socket.id, emoji, taps: 0, x: 0 };
    socket.join(raceId);
    io.to(raceId).emit('state', race);
  });

  socket.on('tapBurst', ({ raceId, d }) => {
    const race = applyTapBurst(raceId, socket.id, d);
    io.to(raceId).emit('state', race);
  });

  socket.on('claimPanic', ({ raceId }) => {
    const upd = applyPanic(raceId, socket.id);
    if (upd) {
      io.to(raceId).emit('state', upd.race);
      io.to(raceId).emit('obstacle', upd.obstacle);
    }
  });

  socket.on('leaveRace', ({ raceId }) => {
    const race = races.get(raceId);
    if (!race) return;

    delete race.players[socket.id];
    socket.leave(raceId);

    if (Object.keys(race.players).length === 0) {
      races.delete(raceId);
      console.log(`🗑️  Race ${raceId} removed`);
    } else {
      io.to(raceId).emit('state', race);
    }
  });

  socket.on('disconnect', () => {
    for (const race of races.values()) {
      if (race.players[socket.id]) {
        delete race.players[socket.id];
        socket.leave(race.id);
        if (Object.keys(race.players).length === 0) races.delete(race.id);
        else io.to(race.id).emit('state', race);
      }
    }
  });
});

setInterval(() => {
  for (const race of races.values()) {
    if (race.finished && !race.notified) {
      race.notified = true;
      io.to(race.id).emit('raceFinished', { winnerId: race.winnerId });
      io.socketsLeave(race.id);
      races.delete(race.id);
    }
  }
}, 200);

httpServer.listen(3000, '0.0.0.0', () => console.log('🟢  http://localhost:3000'));

