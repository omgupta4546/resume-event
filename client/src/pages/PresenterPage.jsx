import { useState, useEffect, useCallback } from 'react';
import socket from '../socket';

// ── GAMIFICATION SOUND EFFECTS ──
let audioCtx = null;
const initAudio = () => {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playTickSound = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.warn(e);
  }
};

const playBuzzerSound = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn(e);
  }
};
const playTaDaSound = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    
    // Ta
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    
    // Da
    osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.15); // G5
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime + 0.15);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1);
    
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 1);
  } catch (e) {
    console.warn(e);
  }
};

const playDrumrollSound = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 1);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
  } catch (e) {
    console.warn(e);
  }
};

const playApplauseSound = () => {
  initAudio();
  if (!audioCtx) return;
  try {
    const bufferSize = audioCtx.sampleRate * 2; 
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.2);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
  } catch (e) {
    console.warn(e);
  }
};

export default function PresenterPage() {
  const [resumeIndex, setResumeIndex] = useState(0);
  const [totalResumes, setTotalResumes] = useState(10);
  const [pollActive, setPollActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [duration, setDuration] = useState(30);
  const [votes, setVotes] = useState({ accept: 0, reject: 0 });
  const [connectedStudents, setConnectedStudents] = useState(0);
  const [pollEnded, setPollEnded] = useState(false);
  const [finalResult, setFinalResult] = useState(null);
  const [allResults, setAllResults] = useState([]);
  const [showFinalBoard, setShowFinalBoard] = useState(false);
  const [showIntermediateBoard, setShowIntermediateBoard] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [emojis, setEmojis] = useState([]);

  useEffect(() => {
    socket.emit('register_presenter');

    const onSyncState = (data) => {
      setResumeIndex(data.currentResumeIndex);
      setTotalResumes(data.totalResumes);
      setPollActive(data.pollActive);
      setTimeRemaining(data.timeRemaining);
      setDuration(data.duration);
      setVotes(data.votes);
      setConnectedStudents(data.connectedStudents || 0);
      if (data.allResults) setAllResults(data.allResults);
    };

    const onResumeChanged = ({ currentResumeIndex, totalResumes: total }) => {
      setResumeIndex(currentResumeIndex);
      setTotalResumes(total);
      setPollEnded(false);
      setFinalResult(null);
      setVotes({ accept: 0, reject: 0 });
    };

    const onPollStarted = ({ duration: dur }) => {
      setPollActive(true);
      setDuration(dur);
      setTimeRemaining(dur);
      setVotes({ accept: 0, reject: 0 });
      setPollEnded(false);
      setFinalResult(null);
      setShowFinalBoard(false);
      setShowIntermediateBoard(false);
    };

    const onTimerTick = ({ timeRemaining: tr }) => {
      setTimeRemaining(tr);
      if (tr <= 5 && tr > 0) {
        playTickSound();
      }
    };

    const onLiveTally = (data) => {
      setVotes({ accept: data.accept, reject: data.reject });
    };

    const onPollEnded = (data) => {
      setPollActive(false);
      setTimeRemaining(0);
      setPollEnded(true);
      setFinalResult(data);
      setVotes({ accept: data.accept, reject: data.reject });
      playBuzzerSound();
    };

    const onPollReset = () => {
      setPollActive(false);
      setTimeRemaining(0);
      setVotes({ accept: 0, reject: 0 });
      setPollEnded(false);
      setFinalResult(null);
    };

    const onStatusUpdate = (data) => {
      setConnectedStudents(data.connectedStudents);
    };

    const onAllResults = (data) => {
      setAllResults(data.results);
    };

    const onShowEmoji = (data) => {
      setEmojis(prev => [...prev, data]);
      setTimeout(() => {
        setEmojis(prev => prev.filter(e => e.id !== data.id));
      }, 3000);
    };

    const onShowIntermediate = () => {
      setShowIntermediateBoard(true);
    };

    const onPlaySoundEffect = ({ sound }) => {
      if (sound === 'wrong') playBuzzerSound();
      else if (sound === 'tada') playTaDaSound();
      else if (sound === 'suspense') playDrumrollSound();
      else if (sound === 'applause') playApplauseSound();
    };

    socket.on('sync_state', onSyncState);
    socket.on('resume_changed', onResumeChanged);
    socket.on('poll_started', onPollStarted);
    socket.on('timer_tick', onTimerTick);
    socket.on('live_tally', onLiveTally);
    socket.on('poll_ended', onPollEnded);
    socket.on('poll_reset', onPollReset);
    socket.on('status_update', onStatusUpdate);
    socket.on('all_results', onAllResults);
    socket.on('show_emoji', onShowEmoji);
    socket.on('show_intermediate_leaderboard', onShowIntermediate);
    socket.on('play_sound_effect', onPlaySoundEffect);

    return () => {
      socket.off('sync_state', onSyncState);
      socket.off('resume_changed', onResumeChanged);
      socket.off('poll_started', onPollStarted);
      socket.off('timer_tick', onTimerTick);
      socket.off('live_tally', onLiveTally);
      socket.off('poll_ended', onPollEnded);
      socket.off('poll_reset', onPollReset);
      socket.off('status_update', onStatusUpdate);
      socket.off('all_results', onAllResults);
      socket.off('show_emoji', onShowEmoji);
      socket.off('show_intermediate_leaderboard', onShowIntermediate);
      socket.off('play_sound_effect', onPlaySoundEffect);
    };
  }, []);

  // ── Keyboard shortcuts ──
  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (!pollActive) {
            setShowFinalBoard(false);
            socket.emit('change_resume', { index: resumeIndex + 1 });
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (!pollActive) {
            setShowFinalBoard(false);
            socket.emit('change_resume', { index: resumeIndex - 1 });
          }
          break;
        case ' ':
          e.preventDefault();
          if (!pollActive) {
            socket.emit('start_poll', { duration: 30 });
          }
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          socket.emit('reset_poll');
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          // Toggle final leaderboard
          socket.emit('request_all_results');
          setShowFinalBoard((prev) => !prev);
          break;
        case 'z':
        case 'Z':
          e.preventDefault();
          setIsZoomed((prev) => !prev);
          break;
        case 'Escape':
          e.preventDefault();
          setShowFinalBoard(false);
          break;
        default:
          break;
      }
    },
    [pollActive, resumeIndex]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Derived values ──
  const totalVotes = votes.accept + votes.reject;
  const acceptPct = totalVotes > 0 ? (votes.accept / totalVotes) * 100 : 0;
  const rejectPct = totalVotes > 0 ? (votes.reject / totalVotes) * 100 : 0;
  const progressPct = duration > 0 ? (timeRemaining / duration) * 100 : 0;
  const isUrgent = timeRemaining <= 5 && timeRemaining > 0;

  const resumeImagePath = `/resumes/resume${resumeIndex + 1}.png`;

  // ── GAMIFIED LEADERBOARD ──
  const calculateLeaderboard = () => {
    const studentScores = {};
    allResults.forEach(poll => {
      if (!poll.correctOption) return;
      (poll.voters || []).forEach(voter => {
        const key = `${voter.name}|${voter.rollNo || voter.branch}`;
        if (!studentScores[key]) {
          studentScores[key] = { name: voter.name, rollNo: voter.rollNo, branch: voter.branch, score: 0, correct: 0, total: 0, streak: 0 };
        }
        studentScores[key].total++;
        if (voter.vote === poll.correctOption) {
          studentScores[key].correct++;
          studentScores[key].score += (voter.score || 100);
          studentScores[key].streak++;
        } else {
          studentScores[key].streak = 0;
        }
      });
    });
    return Object.values(studentScores).sort((a, b) => b.score - a.score);
  };

  if (showIntermediateBoard) {
    const topStudents = calculateLeaderboard().slice(0, 5);
    return (
      <div className="h-screen w-screen bg-dark-900 flex flex-col overflow-hidden text-center justify-center p-8">
        <h1 className="text-6xl font-black text-text-primary mb-12 animate-slide-up">🏆 Live Leaderboard 🏆</h1>
        <div className="max-w-4xl w-full mx-auto grid gap-6">
          {topStudents.length === 0 && <p className="text-2xl text-text-secondary mt-12 animate-fade-in" style={{ animationDelay: '1s' }}>No points awarded yet!</p>}
          {topStudents.map((s, i) => {
            const delay = (topStudents.length - i) * 1.5;
            return (
              <div key={i} className="glass-card p-6 flex items-center justify-between animate-dramatic" style={{ animationDelay: `${delay}s` }}>
                <div className="flex items-center gap-6">
                  <span className="text-5xl font-black text-text-secondary w-16">{i + 1}</span>
                  <div className="text-left">
                    <h2 className="text-3xl font-bold text-text-primary">{s.name}</h2>
                    <p className="text-lg text-text-secondary mt-1">{s.rollNo || s.branch}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-accent-amber">{s.score} pts</div>
                  <div className="text-lg text-accent-green mt-1">
                    {s.correct}/{s.total} Correct {s.streak >= 2 && <span className="ml-2">🔥 Streak</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── FINAL LEADERBOARD VIEW ──
  if (showFinalBoard) {
    const totalAccepts = allResults.reduce((s, r) => s + r.accept, 0);
    const totalRejects = allResults.reduce((s, r) => s + r.reject, 0);
    const totalAllVotes = totalAccepts + totalRejects;

    return (
      <div className="h-screen w-screen bg-dark-900 flex flex-col overflow-hidden select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 bg-dark-800/80 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <h1 className="text-2xl font-extrabold tracking-tight">Final Results — All Resumes</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span>{allResults.length} / {totalResumes} polled</span>
            <span className="text-text-secondary/40">Press F or Esc to go back</span>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 px-8 pt-6 pb-4">
          <div className="glass-card px-6 py-3 text-center">
            <span className="text-3xl font-black text-text-primary">{allResults.length}</span>
            <span className="block text-xs text-text-secondary mt-1">Resumes Polled</span>
          </div>
          <div className="glass-card px-6 py-3 text-center">
            <span className="text-3xl font-black text-accent-green">{totalAccepts}</span>
            <span className="block text-xs text-text-secondary mt-1">Total Accepts</span>
          </div>
          <div className="glass-card px-6 py-3 text-center">
            <span className="text-3xl font-black text-accent-red">{totalRejects}</span>
            <span className="block text-xs text-text-secondary mt-1">Total Rejects</span>
          </div>
          <div className="glass-card px-6 py-3 text-center">
            <span className="text-3xl font-black text-accent-blue">{totalAllVotes}</span>
            <span className="block text-xs text-text-secondary mt-1">Total Votes</span>
          </div>
        </div>

        {/* Results table */}
        <div className="flex-1 overflow-y-auto px-8 pb-6">
          {allResults.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-64">
              <div className="text-center text-text-secondary">
                <span className="text-5xl block mb-4">📭</span>
                <p className="text-lg font-semibold">No polls completed yet</p>
                <p className="text-sm mt-1">Start voting on resumes to see results here</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {allResults.map((r, i) => {
                const rTotal = r.accept + r.reject;
                const rAccPct = rTotal > 0 ? (r.accept / rTotal) * 100 : 0;
                const rRejPct = rTotal > 0 ? (r.reject / rTotal) * 100 : 0;
                const verdict = r.accept > r.reject ? 'ACCEPTED' : r.reject > r.accept ? 'REJECTED' : 'TIE';
                const verdictColor = r.accept > r.reject ? 'text-accent-green' : r.reject > r.accept ? 'text-accent-red' : 'text-accent-amber';
                const verdictIcon = r.accept > r.reject ? '✅' : r.reject > r.accept ? '❌' : '🤝';
                const verdictBg = r.accept > r.reject ? 'bg-accent-green/10 border-accent-green/20' : r.reject > r.accept ? 'bg-accent-red/10 border-accent-red/20' : 'bg-accent-amber/10 border-accent-amber/20';

                return (
                  <div
                    key={r.currentResumeIndex}
                    className="glass-card p-4 flex items-center gap-6 animate-slide-up"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {/* Resume number */}
                    <div className="w-14 h-14 rounded-xl bg-dark-600 flex items-center justify-center shrink-0">
                      <span className="text-xl font-black text-text-primary">
                        {r.currentResumeIndex + 1}
                      </span>
                    </div>

                    {/* Label + bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-text-primary">
                          Resume {r.currentResumeIndex + 1}
                        </span>
                        <span className="text-sm text-text-secondary">{rTotal} votes</span>
                      </div>
                      {/* Horizontal bar */}
                      <div className="w-full h-6 bg-dark-700 rounded-full overflow-hidden flex">
                        {rTotal > 0 && (
                          <>
                            <div
                              className="h-full bg-gradient-to-r from-accent-green to-emerald-400 flex items-center justify-center transition-all duration-500"
                              style={{ width: `${rAccPct}%` }}
                            >
                              {rAccPct > 12 && (
                                <span className="text-[11px] font-bold text-dark-900">
                                  {r.accept} ({Math.round(rAccPct)}%)
                                </span>
                              )}
                            </div>
                            <div
                              className="h-full bg-gradient-to-r from-rose-500 to-accent-red flex items-center justify-center transition-all duration-500"
                              style={{ width: `${rRejPct}%` }}
                            >
                              {rRejPct > 12 && (
                                <span className="text-[11px] font-bold text-white">
                                  {r.reject} ({Math.round(rRejPct)}%)
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Verdict badge */}
                    <div className={`shrink-0 px-4 py-2 rounded-xl border font-bold text-sm ${verdictBg} ${verdictColor}`}>
                      {verdictIcon} {verdict}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-dark-900 overflow-hidden select-none">
      {/* ── Left: Resume Display ── */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-dark-800/80 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗳️</span>
            <h1 className="text-lg font-bold tracking-tight">Resume Vote</h1>
            <div className="ml-6 px-3 py-1 bg-dark-700/80 rounded-lg border border-glass-border shadow-sm flex items-center">
              <span className="text-text-secondary text-[10px] font-bold uppercase tracking-wider mr-2">Event PIN</span>
              <span className="text-accent-blue font-mono font-black tracking-widest text-xl">7073</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
              {connectedStudents} online
            </span>
            <span className="font-mono text-text-primary">
              Resume {resumeIndex + 1} / {totalResumes}
            </span>
          </div>
        </div>

        {/* Resume image */}
        <div className={`flex-1 flex justify-center relative ${isZoomed ? 'overflow-y-auto p-6 items-start' : 'overflow-hidden p-2 items-center'}`}>
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none fixed">
            <div className="w-[80%] h-[80%] bg-accent-blue/5 rounded-full blur-[100px]" />
          </div>

          <div className={`relative z-10 ${isZoomed ? 'w-full' : 'max-h-full max-w-full'}`}>
            <img
              key={resumeIndex}
              src={resumeImagePath}
              alt={`Resume ${resumeIndex + 1}`}
              className={`${isZoomed
                  ? 'w-full h-auto rounded-none border-none shadow-none'
                  : 'h-[calc(100vh-70px)] max-h-full max-w-full w-auto rounded-xl border border-glass-border shadow-2xl'
                } animate-fade-in object-contain mx-auto`}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div
              className="hidden items-center justify-center h-[60vh] w-[40vw] glass-card text-text-secondary flex-col gap-4"
            >
              <span className="text-6xl">📄</span>
              <span className="text-lg font-semibold">Resume {resumeIndex + 1}</span>
              <span className="text-sm">Image not found at {resumeImagePath}</span>
            </div>
          </div>
        </div>

        {/* Bottom nav hint */}
        <div className="flex items-center justify-center gap-6 py-2 text-text-secondary/40 text-xs shrink-0">
          <span>← Prev</span>
          <span>Space = Start</span>
          <span>Z = {isZoomed ? 'Zoom Out' : 'Zoom In'}</span>
          <span>→ Next</span>
          <span>R = Reset</span>
          <span>F = Results</span>
        </div>
      </div>

      {/* ── Right: Voting Panel ── */}
      <div className="w-72 shrink-0 flex flex-col border-l border-glass-border bg-dark-800/50">
        {/* Timer section */}
        <div className="flex flex-col items-center justify-center py-6 border-b border-glass-border">
          {/* SVG Timer Ring */}
          <div className="relative w-32 h-32">
            <svg className="timer-ring w-full h-full" viewBox="0 0 120 120">
              <circle className="timer-ring-track" cx="60" cy="60" r="52" strokeWidth="8" />
              <circle
                className="timer-ring-progress"
                cx="60"
                cy="60"
                r="52"
                strokeWidth="8"
                stroke={isUrgent ? '#ff1744' : pollActive ? '#448aff' : '#2e2e48'}
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - progressPct / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-4xl font-black tabular-nums ${isUrgent
                    ? 'text-accent-red animate-countdown-pulse'
                    : pollActive
                      ? 'text-text-primary'
                      : 'text-text-secondary/50'
                  }`}
              >
                {timeRemaining}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-text-secondary mt-0.5">
                {pollActive ? 'Voting' : pollEnded ? 'Ended' : 'Ready'}
              </span>
            </div>
          </div>

          {/* Total votes count */}
          <div className="mt-4 text-center">
            <span className="text-3xl font-black text-text-primary">{totalVotes}</span>
            <span className="block text-xs text-text-secondary uppercase tracking-wider mt-1">
              Total Votes
            </span>
          </div>
        </div>

        {/* Vote bars */}
        <div className="flex-1 flex gap-4 px-6 py-4">
          {/* Accept bar */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex-1 w-full bg-dark-700 rounded-lg relative overflow-hidden flex flex-col justify-end">
              <div
                className="vote-bar vote-bar-accept w-full"
                style={{ height: `${acceptPct}%` }}
              />
              {/* Count label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-white drop-shadow-lg">
                  {votes.accept}
                </span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-green">
                Accept
              </span>
              <span className="block text-lg font-black text-text-primary">
                {totalVotes > 0 ? Math.round(acceptPct) : 0}%
              </span>
            </div>
          </div>

          {/* Reject bar */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex-1 w-full bg-dark-700 rounded-lg relative overflow-hidden flex flex-col justify-end">
              <div
                className="vote-bar vote-bar-reject w-full"
                style={{ height: `${rejectPct}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-black text-white drop-shadow-lg">
                  {votes.reject}
                </span>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-red">
                Reject
              </span>
              <span className="block text-lg font-black text-text-primary">
                {totalVotes > 0 ? Math.round(rejectPct) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Result banner */}
        {pollEnded && finalResult && (
          <div
            className={`mx-4 mb-4 p-4 rounded-xl text-center font-bold text-lg animate-slide-up ${finalResult.accept >= finalResult.reject
                ? 'bg-accent-green/15 border border-accent-green/30 text-accent-green'
                : 'bg-accent-red/15 border border-accent-red/30 text-accent-red'
              }`}
          >
            {finalResult.accept > finalResult.reject
              ? '✅ ACCEPTED'
              : finalResult.reject > finalResult.accept
                ? '❌ REJECTED'
                : '🤝 TIE'}
          </div>
        )}

        {/* Completed count */}
        <div className="px-4 pb-3 text-center">
          <span className="text-xs text-text-secondary/40">
            {allResults.length} / {totalResumes} completed
          </span>
        </div>
      </div>

      {/* Floating Emojis */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {emojis.map((em) => (
          <div
            key={em.id}
            className="absolute bottom-0 text-5xl animate-float-up"
            style={{ left: `${Math.random() * 80 + 10}%` }}
          >
            {em.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
