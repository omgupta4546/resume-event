import { useState, useEffect } from 'react';
import socket from '../socket';

export default function ResultsPage() {
  const [allResults, setAllResults] = useState([]);
  const [totalResumes, setTotalResumes] = useState(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    socket.emit('register_admin');
    socket.emit('request_all_results');

    const onSyncState = (data) => {
      setTotalResumes(data.totalResumes);
      if (data.allResults) {
        setAllResults(data.allResults);
        setLoading(false);
      }
    };

    const onAllResults = (data) => {
      setAllResults(data.results);
      setTotalResumes(data.totalResumes);
      setLoading(false);
    };

    const onPollEnded = () => {
      // Refresh results when any poll ends
      socket.emit('request_all_results');
    };

    socket.on('sync_state', onSyncState);
    socket.on('all_results', onAllResults);
    socket.on('poll_ended', onPollEnded);

    return () => {
      socket.off('sync_state', onSyncState);
      socket.off('all_results', onAllResults);
      socket.off('poll_ended', onPollEnded);
    };
  }, []);

  const totalAccepts = allResults.reduce((s, r) => s + r.accept, 0);
  const totalRejects = allResults.reduce((s, r) => s + r.reject, 0);
  const totalAllVotes = totalAccepts + totalRejects;
  const acceptedCount = allResults.filter(r => r.accept > r.reject).length;
  const rejectedCount = allResults.filter(r => r.reject > r.accept).length;

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <span className="text-5xl block mb-3">🏆</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Final Results — All Resumes
          </h1>
          <p className="text-text-secondary mt-2">
            {allResults.length} of {totalResumes} resumes polled
          </p>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-text-primary">{allResults.length}</span>
            <span className="block text-xs text-text-secondary mt-1">Polled</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-accent-green">{totalAccepts}</span>
            <span className="block text-xs text-text-secondary mt-1">Total Accepts</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-accent-red">{totalRejects}</span>
            <span className="block text-xs text-text-secondary mt-1">Total Rejects</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-accent-green">{acceptedCount}</span>
            <span className="block text-xs text-text-secondary mt-1">✅ Accepted</span>
          </div>
          <div className="glass-card p-4 text-center">
            <span className="text-3xl font-black text-accent-red">{rejectedCount}</span>
            <span className="block text-xs text-text-secondary mt-1">❌ Rejected</span>
          </div>
        </div>

        {/* Grand total bar */}
        {totalAllVotes > 0 && (
          <div className="glass-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary mb-3">
              Overall Verdict
            </h2>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-accent-green font-bold text-lg">
                {totalAccepts} Accepts ({Math.round((totalAccepts / totalAllVotes) * 100)}%)
              </span>
              <span className="text-text-secondary font-semibold">{totalAllVotes} total votes</span>
              <span className="text-accent-red font-bold text-lg">
                {totalRejects} Rejects ({Math.round((totalRejects / totalAllVotes) * 100)}%)
              </span>
            </div>
            <div className="w-full h-5 bg-dark-700 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-gradient-to-r from-accent-green to-emerald-400 transition-all duration-500"
                style={{ width: `${(totalAccepts / totalAllVotes) * 100}%` }}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-accent-red transition-all duration-500"
                style={{ width: `${(totalRejects / totalAllVotes) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Individual results */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
            Individual Results
          </h2>

          {loading ? (
            <div className="text-center py-16 text-text-secondary">
              <span className="text-4xl block mb-3 animate-pulse-glow">⏳</span>
              <p>Loading results...</p>
            </div>
          ) : allResults.length === 0 ? (
            <div className="text-center py-16 text-text-secondary">
              <span className="text-5xl block mb-4">📭</span>
              <p className="text-lg font-semibold">No polls completed yet</p>
              <p className="text-sm mt-1">Start voting on resumes to see results here</p>
            </div>
          ) : (
            allResults.map((r, i) => {
              const rTotal = r.accept + r.reject;
              const rAccPct = rTotal > 0 ? (r.accept / rTotal) * 100 : 0;
              const rRejPct = rTotal > 0 ? (r.reject / rTotal) * 100 : 0;
              const verdict = r.accept > r.reject ? 'ACCEPTED' : r.reject > r.accept ? 'REJECTED' : 'TIE';
              const verdictColor = r.accept > r.reject ? 'text-accent-green' : r.reject > r.accept ? 'text-accent-red' : 'text-accent-amber';
              const verdictIcon = r.accept > r.reject ? '✅' : r.reject > r.accept ? '❌' : '🤝';
              const verdictBg = r.accept > r.reject
                ? 'bg-accent-green/10 border-accent-green/20'
                : r.reject > r.accept
                ? 'bg-accent-red/10 border-accent-red/20'
                : 'bg-accent-amber/10 border-accent-amber/20';

              return (
                <div
                  key={r.currentResumeIndex}
                  className="glass-card p-5 flex items-center gap-5 animate-slide-up"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  {/* Resume number */}
                  <div className="w-14 h-14 rounded-xl bg-dark-600 flex items-center justify-center shrink-0">
                    <span className="text-xl font-black text-text-primary">
                      #{r.currentResumeIndex + 1}
                    </span>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-text-primary text-lg">
                        Resume {r.currentResumeIndex + 1}
                      </span>
                      <span className="text-sm text-text-secondary">{rTotal} votes</span>
                    </div>
                    <div className="w-full h-7 bg-dark-700 rounded-full overflow-hidden flex">
                      {rTotal > 0 && (
                        <>
                          <div
                            className="h-full bg-gradient-to-r from-accent-green to-emerald-400 flex items-center justify-center transition-all duration-700"
                            style={{ width: `${rAccPct}%` }}
                          >
                            {rAccPct > 15 && (
                              <span className="text-xs font-bold text-dark-900">
                                {r.accept} ({Math.round(rAccPct)}%)
                              </span>
                            )}
                          </div>
                          <div
                            className="h-full bg-gradient-to-r from-rose-500 to-accent-red flex items-center justify-center transition-all duration-700"
                            style={{ width: `${rRejPct}%` }}
                          >
                            {rRejPct > 15 && (
                              <span className="text-xs font-bold text-white">
                                {r.reject} ({Math.round(rRejPct)}%)
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Verdict */}
                  <div className={`shrink-0 px-5 py-2.5 rounded-xl border font-bold text-sm ${verdictBg} ${verdictColor}`}>
                    {verdictIcon} {verdict}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pending resumes */}
        {allResults.length < totalResumes && allResults.length > 0 && (
          <div className="glass-card p-4 text-center text-text-secondary text-sm">
            ⏳ {totalResumes - allResults.length} resume{totalResumes - allResults.length > 1 ? 's' : ''} still pending
          </div>
        )}
      </div>
    </div>
  );
}
