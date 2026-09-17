import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';

// ─── Step 1: Registration Form ──────────────────────────────
function RegistrationForm({ onRegister }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const student = {
      name: name.trim(),
      year: year || 'N/A',
      branch: branch || 'N/A',
    };
    localStorage.setItem('rv_student', JSON.stringify(student));
    onRegister(student);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-dark-900">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-accent-purple/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-accent-blue/15 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-blue/15 mb-4">
            <span className="text-3xl">🗳️</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
            Resume Vote
          </h1>
          <p className="text-text-secondary text-sm mt-1">Join the live voting session</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Your Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              autoFocus
              className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-glass-border text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-glass-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all appearance-none"
              >
                <option value="">Select</option>
                <option value="1st">1st Year</option>
                <option value="2nd">2nd Year</option>
                <option value="3rd">3rd Year</option>
                <option value="4th">4th Year</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. CSE"
                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-glass-border text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-accent-purple font-bold text-white text-lg tracking-wide transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Join Session →
          </button>
        </form>

        <p className="text-center text-text-secondary/50 text-xs mt-4">
          Your info is stored locally on this device
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Voting Remote ──────────────────────────────────
function VotingRemote({ student }) {
  const [pollActive, setPollActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [duration, setDuration] = useState(30);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState(null);
  const [voteError, setVoteError] = useState('');
  const [connected, setConnected] = useState(socket.connected);
  const [resumeIndex, setResumeIndex] = useState(0);
  const [totalResumes, setTotalResumes] = useState(10);

  useEffect(() => {
    socket.emit('register_student');

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onSyncState = (data) => {
      setPollActive(data.pollActive);
      setTimeRemaining(data.timeRemaining);
      setDuration(data.duration);
      if (data.currentResumeIndex !== undefined) setResumeIndex(data.currentResumeIndex);
      if (data.totalResumes) setTotalResumes(data.totalResumes);
    };

    const onPollStarted = (data) => {
      setPollActive(true);
      setDuration(data.duration);
      setTimeRemaining(data.duration);
      if (data.currentResumeIndex !== undefined) setResumeIndex(data.currentResumeIndex);
      setHasVoted(false);
      setVotedFor(null);
      setVoteError('');
    };

    const onResumeChanged = (data) => {
      if (data.currentResumeIndex !== undefined) setResumeIndex(data.currentResumeIndex);
      if (data.totalResumes) setTotalResumes(data.totalResumes);
    };

    const onTimerTick = ({ timeRemaining: t }) => {
      setTimeRemaining(t);
    };

    const onPollEnded = () => {
      setPollActive(false);
      setTimeRemaining(0);
      // Vibrate pattern when timer ends
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    };

    const onPollReset = () => {
      setPollActive(false);
      setTimeRemaining(0);
      setHasVoted(false);
      setVotedFor(null);
      setVoteError('');
    };

    const onVoteAck = () => {
      // Already handled optimistically
    };

    const onVoteError = ({ message }) => {
      setVoteError(message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('sync_state', onSyncState);
    socket.on('poll_started', onPollStarted);
    socket.on('resume_changed', onResumeChanged);
    socket.on('timer_tick', onTimerTick);
    socket.on('poll_ended', onPollEnded);
    socket.on('poll_reset', onPollReset);
    socket.on('vote_ack', onVoteAck);
    socket.on('vote_error', onVoteError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('sync_state', onSyncState);
      socket.off('poll_started', onPollStarted);
      socket.off('resume_changed', onResumeChanged);
      socket.off('timer_tick', onTimerTick);
      socket.off('poll_ended', onPollEnded);
      socket.off('poll_reset', onPollReset);
      socket.off('vote_ack', onVoteAck);
      socket.off('vote_error', onVoteError);
    };
  }, []);

  const submitVote = useCallback(
    (vote) => {
      if (hasVoted || !pollActive) return;
      // Optimistic UI
      setHasVoted(true);
      setVotedFor(vote);
      if (navigator.vibrate) navigator.vibrate(50);
      socket.emit('submit_vote', {
        name: student.name,
        year: student.year,
        branch: student.branch,
        vote,
      });
    },
    [hasVoted, pollActive, student]
  );

  const progressPct = duration > 0 ? (timeRemaining / duration) * 100 : 0;
  const isUrgent = timeRemaining <= 5 && timeRemaining > 0;

  // ── Connection lost overlay ──
  if (!connected) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-dark-900">
        <div className="text-center animate-pulse-glow">
          <div className="text-5xl mb-4">📡</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Reconnecting…</h2>
          <p className="text-text-secondary text-sm">Check your Wi-Fi connection</p>
        </div>
      </div>
    );
  }

  // ── Vote submitted state ──
  if (hasVoted) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-dark-900">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div
            className={`absolute inset-0 ${
              votedFor === 'accept' ? 'bg-accent-green/5' : 'bg-accent-red/5'
            }`}
          />
        </div>
        <div className="relative z-10 text-center animate-vote-success">
          <div className="text-7xl mb-4">✅</div>
          <h2 className="text-2xl font-extrabold text-text-primary mb-2">Vote Registered!</h2>
          <p className="text-text-secondary">
            You voted{' '}
            <span
              className={`font-bold ${
                votedFor === 'accept' ? 'text-accent-green' : 'text-accent-red'
              }`}
            >
              {votedFor === 'accept' ? 'ACCEPT' : 'REJECT'}
            </span>
          </p>
          {pollActive && timeRemaining > 0 && (
            <div className="mt-6 text-text-secondary/60 text-sm">
              ⏳ {timeRemaining}s remaining for others
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Idle state: waiting for poll ──
  if (!pollActive) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-dark-900">
        {/* Preload all images silently to prevent router crash during vote spikes */}
        <div style={{ display: 'none' }}>
          {Array.from({ length: totalResumes }, (_, i) => (
            <img key={i} src={`/resumes/resume${i + 1}.png`} alt="" decoding="async" />
          ))}
        </div>
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-accent-purple/8 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 text-center">
          <div className="text-5xl mb-4 animate-pulse-glow">👀</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Look at the screen</h2>
          <p className="text-text-secondary text-sm">Waiting for the next voting round…</p>
          <div className="mt-6 flex items-center gap-2 justify-center text-text-secondary/50 text-xs">
            <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
            Connected as <span className="font-semibold text-text-primary">{student.name}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Active poll: show buttons ──
  return (
    <div className="min-h-dvh flex flex-col bg-dark-900">
      {/* Timer bar */}
      <div className="relative w-full h-2 bg-dark-700">
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-1000 linear rounded-r-full ${
            isUrgent ? 'bg-accent-red animate-pulse' : 'bg-accent-blue'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Timer display */}
      <div className="text-center pt-6 pb-4">
        <div
          className={`text-6xl font-black tabular-nums ${
            isUrgent ? 'text-accent-red animate-countdown-pulse' : 'text-text-primary'
          }`}
        >
          {timeRemaining}
        </div>
        <p className="text-text-secondary text-sm mt-1">seconds remaining</p>
      </div>

      {/* Vote error */}
      {voteError && (
        <div className="mx-6 mb-4 p-3 rounded-xl bg-accent-red/15 border border-accent-red/30 text-accent-red text-sm text-center animate-shake">
          {voteError}
        </div>
      )}

      {/* Mobile Resume Viewer */}
      <div className="flex-1 min-h-[250px] px-4 pb-2 overflow-y-auto">
        <div className="bg-dark-800/50 rounded-xl p-2 border border-glass-border shadow-inner">
          <img
            src={`/resumes/resume${resumeIndex + 1}.png`}
            alt={`Resume ${resumeIndex + 1}`}
            className="w-full h-auto rounded-lg"
          />
        </div>
      </div>

      {/* Voting buttons — fixed at bottom */}
      <div className="flex-none flex gap-3 p-4 pt-2">
        <button
          onClick={() => submitVote('accept')}
          disabled={hasVoted}
          className="vote-btn vote-btn-accept flex-1 flex flex-col items-center justify-center gap-1 py-4 min-h-[100px]"
        >
          <span className="text-3xl">✓</span>
          <span className="font-bold tracking-widest text-sm">ACCEPT</span>
        </button>

        <button
          onClick={() => submitVote('reject')}
          disabled={hasVoted}
          className="vote-btn vote-btn-reject flex-1 flex flex-col items-center justify-center gap-1 py-4 min-h-[100px]"
        >
          <span className="text-3xl">✗</span>
          <span className="font-bold tracking-widest text-sm">REJECT</span>
        </button>
      </div>
    </div>
  );
}

// ─── Student Page (Combines Registration + Remote) ──────────
export default function StudentPage() {
  const [student, setStudent] = useState(() => {
    try {
      const saved = localStorage.getItem('rv_student');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  if (!student) {
    return <RegistrationForm onRegister={setStudent} />;
  }

  return <VotingRemote student={student} />;
}
