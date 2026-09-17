import { useState, useEffect } from 'react';
import socket from '../socket';

export default function AdminPage() {
  const [resumeIndex, setResumeIndex] = useState(0);
  const [totalResumes, setTotalResumes] = useState(10);
  const [pollActive, setPollActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [duration, setDuration] = useState(30);
  const [votes, setVotes] = useState({ accept: 0, reject: 0 });
  const [connectedStudents, setConnectedStudents] = useState(0);
  const [correctOption, setCorrectOption] = useState(null);
  const [customDuration, setCustomDuration] = useState(45);
  const [logs, setLogs] = useState([]);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  const addLog = (msg) => {
    setLogs((prev) => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    socket.emit('register_admin');

    const onSyncState = (data) => {
      setResumeIndex(data.currentResumeIndex);
      setTotalResumes(data.totalResumes);
      setPollActive(data.pollActive);
      setTimeRemaining(data.timeRemaining);
      setDuration(data.duration);
      setVotes(data.votes);
      setConnectedStudents(data.connectedStudents || 0);
      setCorrectOption(data.correctOption || null);
      addLog('Synced with server');
    };

    const onResumeChanged = ({ currentResumeIndex, totalResumes: total }) => {
      setResumeIndex(currentResumeIndex);
      setTotalResumes(total);
      setVotes({ accept: 0, reject: 0 });
      addLog(`Switched to Resume ${currentResumeIndex + 1}`);
    };

    const onPollStarted = ({ duration: dur }) => {
      setPollActive(true);
      setDuration(dur);
      setTimeRemaining(dur);
      setVotes({ accept: 0, reject: 0 });
      addLog(`Poll started (${dur}s)`);
    };

    const onTimerTick = ({ timeRemaining: t }) => {
      setTimeRemaining(t);
    };

    const onLiveTally = (data) => {
      setVotes({ accept: data.accept, reject: data.reject });
    };

    const onPollEnded = (data) => {
      setPollActive(false);
      setTimeRemaining(0);
      setVotes({ accept: data.accept, reject: data.reject });
      addLog(`Poll ended — Accept: ${data.accept}, Reject: ${data.reject}`);
    };

    const onPollReset = () => {
      setPollActive(false);
      setTimeRemaining(0);
      setVotes({ accept: 0, reject: 0 });
      setCorrectOption(null);
      addLog('Poll reset');
    };

    const onCorrectOptionUpdated = (data) => {
      setCorrectOption(data.correctOption);
      addLog(`Correct answer set to: ${data.correctOption}`);
    };

    const onStatusUpdate = (data) => {
      setConnectedStudents(data.connectedStudents);
    };

    socket.on('sync_state', onSyncState);
    socket.on('resume_changed', onResumeChanged);
    socket.on('poll_started', onPollStarted);
    socket.on('timer_tick', onTimerTick);
    socket.on('live_tally', onLiveTally);
    socket.on('poll_ended', onPollEnded);
    socket.on('poll_reset', onPollReset);
    socket.on('status_update', onStatusUpdate);
    socket.on('correct_option_updated', onCorrectOptionUpdated);

    return () => {
      socket.off('sync_state', onSyncState);
      socket.off('resume_changed', onResumeChanged);
      socket.off('poll_started', onPollStarted);
      socket.off('timer_tick', onTimerTick);
      socket.off('live_tally', onLiveTally);
      socket.off('poll_ended', onPollEnded);
      socket.off('poll_reset', onPollReset);
      socket.off('status_update', onStatusUpdate);
      socket.off('correct_option_updated', onCorrectOptionUpdated);
    };
  }, []);

  const totalVotes = votes.accept + votes.reject;

  const handleLogin = (e) => {
    e.preventDefault();
    const correctPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'ptp26';
    if (passwordInput === correctPassword) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Incorrect password');
      setPasswordInput('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="glass-card p-8 w-full max-w-sm animate-slide-up">
          <div className="text-center mb-6">
            <span className="text-4xl mb-3 block">🔒</span>
            <h1 className="text-2xl font-bold text-text-primary">Admin Access</h1>
            <p className="text-text-secondary text-sm mt-1">Enter password to continue</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded-xl bg-dark-700 border border-glass-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                autoFocus
              />
              {authError && <p className="text-accent-red text-xs mt-2 text-center animate-shake">{authError}</p>}
            </div>
            
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-accent-blue font-bold text-white transition-all hover:brightness-110 active:scale-95"
            >
              Unlock
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Admin Panel</h1>
              <p className="text-text-secondary text-sm">Control the voting session</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 bg-accent-green rounded-full animate-pulse" />
            <span className="text-text-secondary">{connectedStudents} students online</span>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-text-primary">{resumeIndex + 1}</span>
            <span className="block text-xs text-text-secondary mt-1">
              of {totalResumes} Resumes
            </span>
          </div>
          <div className="glass-card p-4 text-center">
            <span
              className={`text-3xl font-black tabular-nums ${
                pollActive ? 'text-accent-blue' : 'text-text-secondary/40'
              }`}
            >
              {timeRemaining}s
            </span>
            <span className="block text-xs text-text-secondary mt-1">
              {pollActive ? 'Timer Active' : 'Timer Idle'}
            </span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-accent-green">{votes.accept}</span>
            <span className="block text-xs text-text-secondary mt-1">Accepts</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-accent-red">{votes.reject}</span>
            <span className="block text-xs text-text-secondary mt-1">Rejects</span>
          </div>
        </div>

        {/* Controls */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">
            Resume Navigation
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => socket.emit('change_resume', { index: resumeIndex - 1 })}
              disabled={pollActive || resumeIndex <= 0}
              className="admin-btn bg-dark-600 text-text-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <button
              onClick={() => socket.emit('change_resume', { index: resumeIndex + 1 })}
              disabled={pollActive || resumeIndex >= totalResumes - 1}
              className="admin-btn bg-dark-600 text-text-primary flex-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-4">
            Poll Controls
          </h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => socket.emit('start_poll', { duration: 60 })}
              disabled={pollActive}
              className="admin-btn bg-accent-blue text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▶ Start 60s
            </button>
            <button
              onClick={() => socket.emit('start_poll', { duration: 30 })}
              disabled={pollActive}
              className="admin-btn bg-accent-purple text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ▶ Start 30s
            </button>
          </div>
          
          <div className="flex gap-3 mb-4">
            <input 
              type="number" 
              value={customDuration}
              onChange={(e) => setCustomDuration(Number(e.target.value))}
              min="1"
              max="300"
              className="w-24 px-3 py-2 rounded-xl bg-dark-700 border border-glass-border text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              disabled={pollActive}
            />
            <button
              onClick={() => socket.emit('start_poll', { duration: customDuration })}
              disabled={pollActive}
              className="admin-btn bg-dark-600 text-white disabled:opacity-30 disabled:cursor-not-allowed flex-1"
            >
              ▶ Start Custom ({customDuration}s)
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => socket.emit('add_time', { amount: 10 })}
              disabled={!pollActive}
              className="admin-btn bg-accent-green text-dark-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              +10s
            </button>
            <button
              onClick={() => socket.emit('end_poll')}
              disabled={!pollActive}
              className="admin-btn bg-accent-amber text-dark-900 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ⏹ End Poll
            </button>
            <button
              onClick={() => socket.emit('reset_poll')}
              className="admin-btn bg-accent-red text-white"
            >
              ↺ Reset
            </button>
          </div>
        </div>

        {/* Set Correct Answer */}
        <div className="glass-card p-6 border-l-4 border-l-accent-purple">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              Set Correct Answer (Quiz Mode)
            </h2>
            {correctOption && (
              <span className={`text-xs font-bold px-2 py-1 rounded ${correctOption === 'accept' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'}`}>
                Current: {correctOption.toUpperCase()}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => socket.emit('set_correct_option', { option: 'accept' })}
              disabled={!pollActive}
              className={`admin-btn font-bold transition-all ${
                correctOption === 'accept' 
                  ? 'bg-accent-green text-dark-900 border-2 border-white' 
                  : 'bg-dark-600 text-accent-green hover:bg-dark-500'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              ✅ Set ACCEPT as Correct
            </button>
            <button
              onClick={() => socket.emit('set_correct_option', { option: 'reject' })}
              disabled={!pollActive}
              className={`admin-btn font-bold transition-all ${
                correctOption === 'reject' 
                  ? 'bg-accent-red text-white border-2 border-white' 
                  : 'bg-dark-600 text-accent-red hover:bg-dark-500'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              ❌ Set REJECT as Correct
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-3">
            * You can only set the correct answer while the poll is active. Students won't see this.
          </p>
        </div>

        {/* Final Results Link */}
        <a
          href="/results"
          target="_blank"
          rel="noopener noreferrer"
          className="block glass-card p-4 text-center hover:bg-accent-purple/10 transition-colors"
        >
          <span className="text-lg">🏆</span>
          <span className="ml-2 font-bold text-accent-purple">View All Results →</span>
          <span className="block text-xs text-text-secondary mt-1">Opens final leaderboard in new tab</span>
        </a>

        {/* Live tally bar */}
        {totalVotes > 0 && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-accent-green font-bold">
                Accept {votes.accept} ({totalVotes > 0 ? Math.round((votes.accept / totalVotes) * 100) : 0}%)
              </span>
              <span className="text-text-secondary font-semibold">{totalVotes} total</span>
              <span className="text-accent-red font-bold">
                Reject {votes.reject} ({totalVotes > 0 ? Math.round((votes.reject / totalVotes) * 100) : 0}%)
              </span>
            </div>
            <div className="w-full h-4 bg-dark-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-accent-green to-emerald-400 transition-all duration-300"
                style={{ width: `${(votes.accept / totalVotes) * 100}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-accent-red transition-all duration-300"
                style={{ width: `${(votes.reject / totalVotes) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Event Log */}
        <div className="glass-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">
            Event Log
          </h2>
          <div className="max-h-48 overflow-y-auto space-y-1.5">
            {logs.length === 0 && (
              <p className="text-text-secondary/50 text-sm">No events yet…</p>
            )}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-text-secondary/50 font-mono text-xs shrink-0 pt-0.5">
                  {log.time}
                </span>
                <span className="text-text-secondary">{log.msg}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
