require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');
const VoteRecord = require('./models/VoteRecord');

// ─── Configuration ───────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/resume-vote';

// Resume image paths — add/remove entries here
const RESUMES = [
  '/resumes/resume1.png',
  '/resumes/resume2.png',
  '/resumes/resume3.png',
  '/resumes/resume4.png',
  '/resumes/resume5.png',
  '/resumes/resume6.png',
  '/resumes/resume7.png',
  '/resumes/resume8.png',
];

// ─── Express + Socket.io Setup ───────────────────────────────────
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allows Vercel frontend to connect to Render backend
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling'],
});

// Serve static resume images from client/public/resumes (moved for Vercel CDN)
app.use(express.static(path.join(__dirname, '..', 'client', 'public'), {
  maxAge: '1y',
  etag: false
}));

// (Frontend is hosted on Vercel, so we don't serve the React build here anymore)

// API: Get all stored results
app.get('/api/results', async (_req, res) => {
  try {
    const records = await VoteRecord.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get resume list
app.get('/api/resumes', (_req, res) => {
  res.json(RESUMES);
});

// Root endpoint for health checks (e.g. Render)
app.get('/', (_req, res) => {
  res.send('Resume Vote API Backend is running! Frontend is hosted on Vercel.');
});

// Fallback for unknown API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// ─── In-Memory Live State ────────────────────────────────────────
let state = {
  pollActive: false,
  duration: 30,
  timeRemaining: 0,
  currentResumeIndex: 0,
  votes: { accept: 0, reject: 0 },
  votedUsers: new Map(),    // key: "name|branch" → vote value
  connectedStudents: 0,
  correctOption: null,
};

// In-memory results history (survives without MongoDB)
let allResults = [];

let timerInterval = null;

function resetPollState() {
  state.pollActive = false;
  state.timeRemaining = 0;
  state.votes = { accept: 0, reject: 0 };
  state.votedUsers = new Map();
  state.correctOption = null;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ─── Socket.io Logic ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  // Track student connections
  socket.on('register_student', () => {
    socket.data.role = 'student';
    state.connectedStudents++;
    broadcastStatus();
  });

  socket.on('register_presenter', () => {
    socket.data.role = 'presenter';
    socket.join('control');       // presenter + admin room
  });

  socket.on('register_admin', () => {
    socket.data.role = 'admin';
    socket.join('control');
  });

  // ── Sync: Send current state to newly connected clients ──
  socket.emit('sync_state', {
    pollActive: state.pollActive,
    duration: state.duration,
    timeRemaining: state.timeRemaining,
    currentResumeIndex: state.currentResumeIndex,
    votes: state.votes,
    totalResumes: RESUMES.length,
    connectedStudents: state.connectedStudents,
    correctOption: state.correctOption,
    allResults,
  });

  // ── Request All Results (for /results page) ──
  socket.on('request_all_results', () => {
    socket.emit('all_results', { results: allResults, totalResumes: RESUMES.length });
  });

  // ── Change Resume ──
  socket.on('change_resume', ({ index }) => {
    if (state.pollActive) return; // Block during active poll
    if (index < 0 || index >= RESUMES.length) return;
    state.currentResumeIndex = index;
    resetPollState();
    io.emit('resume_changed', {
      currentResumeIndex: state.currentResumeIndex,
      totalResumes: RESUMES.length,
    });
    broadcastStatus();
  });

  // ── Start Poll ──
  socket.on('start_poll', ({ duration }) => {
    if (state.pollActive) return;

    const dur = duration || 30;
    resetPollState();
    state.pollActive = true;
    state.duration = dur;
    state.timeRemaining = dur;

    io.emit('poll_started', {
      duration: dur,
      currentResumeIndex: state.currentResumeIndex,
    });

    // Server-authoritative countdown
    timerInterval = setInterval(() => {
      state.timeRemaining--;

      io.emit('timer_tick', { timeRemaining: state.timeRemaining });

      if (state.timeRemaining <= 0) {
        endPoll();
      }
    }, 1000);
  });

  // ── Submit Vote ──
  socket.on('submit_vote', ({ name, rollNo, year, branch, vote }) => {
    if (!state.pollActive) return;
    if (!name || !vote) return;
    if (vote !== 'accept' && vote !== 'reject') return;

    const uniqueKey = `${name.trim().toLowerCase()}|${(rollNo || '').trim().toLowerCase()}`;
    if (state.votedUsers.has(uniqueKey)) {
      socket.emit('vote_error', { message: 'You have already voted.' });
      return;
    }

    // Record vote with speed score
    const score = state.duration > 0 ? Math.max(10, Math.round((state.timeRemaining / state.duration) * 1000)) : 100;
    state.votedUsers.set(uniqueKey, { name, rollNo, year, branch, vote, score });
    state.votes[vote]++;

    // Acknowledge to student
    socket.emit('vote_ack', { success: true });

    // Broadcast live tally ONLY to presenter/admin
    io.to('control').emit('live_tally', {
      accept: state.votes.accept,
      reject: state.votes.reject,
      totalVotes: state.votes.accept + state.votes.reject,
    });
  });

  // ── Reset Poll ──
  socket.on('reset_poll', () => {
    resetPollState();
    io.emit('poll_reset', {
      currentResumeIndex: state.currentResumeIndex,
    });
    broadcastStatus();
  });

  // ── End Poll (manual) ──
  socket.on('end_poll', () => {
    if (state.pollActive) {
      endPoll();
    }
  });

  // ── Set Correct Option (Admin Only) ──
  socket.on('set_correct_option', ({ option }) => {
    if (socket.data.role !== 'admin') return;
    if (option !== 'accept' && option !== 'reject' && option !== null) return;
    state.correctOption = option;
    io.to('control').emit('correct_option_updated', { correctOption: option });
  });

  // ── Add Time ──
  socket.on('add_time', ({ amount }) => {
    if (socket.data.role !== 'admin') return;
    if (!state.pollActive) return;
    state.timeRemaining += amount;
    state.duration += amount; // Optional: increases total progress bar time too
  });

  // ── Gamification: Show Leaderboard ──
  socket.on('show_leaderboard', () => {
    if (socket.data.role !== 'admin') return;
    io.to('control').emit('show_intermediate_leaderboard');
  });

  // ── Gamification: Send Emoji ──
  socket.on('send_emoji', ({ emoji }) => {
    // Broadcast to control room (Admin + Presenter)
    io.to('control').emit('show_emoji', { emoji, id: Math.random().toString(36).substring(7) });
  });

  // ── Presenter Soundboard ──
  socket.on('play_sound', ({ sound }) => {
    if (socket.data.role !== 'admin') return;
    io.to('control').emit('play_sound_effect', { sound });
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    if (socket.data.role === 'student') {
      state.connectedStudents = Math.max(0, state.connectedStudents - 1);
      broadcastStatus();
    }
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

function broadcastStatus() {
  io.to('control').emit('status_update', {
    connectedStudents: state.connectedStudents,
    currentResumeIndex: state.currentResumeIndex,
    totalResumes: RESUMES.length,
    pollActive: state.pollActive,
  });
}

async function endPoll() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  state.pollActive = false;
  state.timeRemaining = 0;

  const voters = [];
  for (const [, v] of state.votedUsers) {
    voters.push({
      name: v.name,
      rollNo: v.rollNo,
      year: v.year,
      branch: v.branch,
      vote: v.vote,
      score: v.score,
    });
  }

  const finalTally = {
    accept: state.votes.accept,
    reject: state.votes.reject,
    totalVotes: state.votes.accept + state.votes.reject,
    currentResumeIndex: state.currentResumeIndex,
    resumeLabel: `Resume ${state.currentResumeIndex + 1}`,
    correctOption: state.correctOption,
    voters: voters,
  };

  // Store in memory for the final leaderboard
  // Replace if same resume was polled again (re-poll)
  const existingIdx = allResults.findIndex(r => r.currentResumeIndex === state.currentResumeIndex);
  if (existingIdx !== -1) {
    allResults[existingIdx] = finalTally;
  } else {
    allResults.push(finalTally);
  }
  // Sort by resume index
  allResults.sort((a, b) => a.currentResumeIndex - b.currentResumeIndex);

  // Broadcast poll ended to ALL clients
  io.emit('poll_ended', finalTally);

  // Final tally to control room
  io.to('control').emit('live_tally', finalTally);

  // Broadcast updated allResults to control room for the Leaderboard
  io.to('control').emit('all_results', { results: allResults });

  // ── Persist to MongoDB ──
  try {
    await VoteRecord.create({
      resumeIndex: state.currentResumeIndex,
      resumeLabel: `Resume ${state.currentResumeIndex + 1}`,
      acceptCount: state.votes.accept,
      rejectCount: state.votes.reject,
      totalVoters: voters.length,
      voters,
      duration: state.duration,
      correctOption: state.correctOption,
    });
    console.log(`💾 Saved poll results for Resume #${state.currentResumeIndex + 1}`);
  } catch (err) {
    console.error('❌ MongoDB save error:', err.message);
  }
}

// ─── Start Server ────────────────────────────────────────────────
async function boot() {
  // Connect to MongoDB (non-blocking — app works even if Mongo is down)
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 3000 });
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.warn('⚠️  MongoDB not available. Results will NOT be persisted.');
    console.warn('   The app will still work for live voting.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║      🗳️  Resume Vote — Live Voting Server       ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Local:     http://localhost:${PORT}              ║`);
    console.log(`║  Network:   http://<YOUR_IP>:${PORT}              ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  Routes:                                        ║');
    console.log('║    /student    — Mobile voting remote            ║');
    console.log('║    /presenter  — Projector / stage view          ║');
    console.log('║    /admin      — Control panel                   ║');
    console.log('║    /results    — Final leaderboard               ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
  });
}

boot();
