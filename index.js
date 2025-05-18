import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { makeRace, applyTapBurst, applyPanic } from './raceState.js';

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
  socket.on('joinRace', ({ raceId, emoji }) => {
    const race = makeRace(raceId);
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
    if (upd) io.to(raceId).emit('state', upd.race),
             io.to(raceId).emit('obstacle', upd.obstacle);
  });
});

httpServer.listen(3000, () => console.log('🟢  http://localhost:3000'));

