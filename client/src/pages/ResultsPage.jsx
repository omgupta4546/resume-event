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

  // Calculate Leaderboard
  const studentScores = {};
  let totalQuestionsWithAnswers = 0;

  allResults.forEach((poll) => {
    if (poll.correctOption === 'accept' || poll.correctOption === 'reject') {
      totalQuestionsWithAnswers++;
      if (poll.voters && Array.isArray(poll.voters)) {
        poll.voters.forEach((voter) => {
          const key = `${voter.name.trim().toLowerCase()}|${(voter.rollNo || voter.branch || '').trim().toLowerCase()}`;
          if (!studentScores[key]) {
            studentScores[key] = {
              name: voter.name,
              rollNo: voter.rollNo,
              branch: voter.branch,
              score: 0,
              correct: 0,
              totalAttempted: 0,
              streak: 0,
            };
          }
          studentScores[key].totalAttempted++;
          if (voter.vote === poll.correctOption) {
            studentScores[key].correct++;
            studentScores[key].score += (voter.score || 100);
            studentScores[key].streak++;
          } else {
            studentScores[key].streak = 0;
          }
        });
      }
    }
  });

  const leaderboard = Object.values(studentScores).sort((a, b) => b.score - a.score);
  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

    const getRankTitle = (correct, total) => {
      if (total === 0) return 'Newbie';
      const acc = correct / total;
      if (acc === 1) return 'God-Level HR 👑';
      if (acc >= 0.5) return 'Senior Recruiter 💼';
      if (acc > 0) return 'Confused Intern 🐣';
      return 'Blind Recruiter 🕶️';
    };

    return (
      <div className="min-h-screen bg-dark-900">
        <div className="max-w-5xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="text-center pt-8 pb-4">
            <span className="text-6xl block mb-4 animate-pulse-glow">🏆</span>
            <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
              Student Leaderboard
            </h1>
            <p className="text-text-secondary mt-2 text-lg">
              {allResults.length} of {totalResumes} Resumes Completed • {totalQuestionsWithAnswers} Valid Questions
            </p>
          </div>

          {loading ? (
            <div className="text-center py-16 text-text-secondary">
              <span className="text-4xl block mb-3 animate-pulse-glow">⏳</span>
              <p>Loading leaderboard...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-16 text-text-secondary glass-card">
              <span className="text-5xl block mb-4">📭</span>
              <p className="text-lg font-semibold">No valid data yet</p>
              <p className="text-sm mt-1">Start voting and ensure the admin sets the "Correct Answer" to see the leaderboard.</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {top3.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pt-4">
                  {top3[1] && (
                    <div className="glass-card p-6 flex flex-col items-center justify-end border-t-4 border-t-slate-400 transform translate-y-4">
                      <span className="text-4xl mb-2">🥈</span>
                      <h3 className="text-xl font-bold text-text-primary">{top3[1].name}</h3>
                      <p className="text-text-secondary text-sm mb-2">{top3[1].rollNo || top3[1].branch}</p>
                      <p className="text-accent-blue text-xs font-bold mb-4">{getRankTitle(top3[1].correct, totalQuestionsWithAnswers)}</p>
                      <div className="bg-dark-600 px-4 py-2 rounded-lg w-full text-center">
                        <span className="font-bold text-lg text-slate-300">{top3[1].score} pts</span>
                        <div className="text-xs text-text-secondary mt-1">{top3[1].correct}/{totalQuestionsWithAnswers} {top3[1].streak >= 2 && '🔥'}</div>
                      </div>
                    </div>
                  )}
                  
                  {top3[0] && (
                    <div className="glass-card p-6 flex flex-col items-center justify-end border-t-4 border-t-yellow-400 bg-gradient-to-b from-yellow-400/10 to-transparent">
                      <span className="text-5xl mb-2 animate-pulse">👑</span>
                      <h3 className="text-2xl font-bold text-text-primary">{top3[0].name}</h3>
                      <p className="text-text-secondary text-sm mb-2">{top3[0].rollNo || top3[0].branch}</p>
                      <p className="text-accent-blue text-sm font-bold mb-4">{getRankTitle(top3[0].correct, totalQuestionsWithAnswers)}</p>
                      <div className="bg-dark-600 px-4 py-2 rounded-lg w-full text-center">
                        <span className="font-bold text-xl text-yellow-400">{top3[0].score} pts</span>
                        <div className="text-xs text-text-secondary mt-1">{top3[0].correct}/{totalQuestionsWithAnswers} {top3[0].streak >= 2 && '🔥'}</div>
                      </div>
                    </div>
                  )}
                  
                  {top3[2] && (
                    <div className="glass-card p-6 flex flex-col items-center justify-end border-t-4 border-t-amber-600 transform translate-y-8">
                      <span className="text-4xl mb-2">🥉</span>
                      <h3 className="text-xl font-bold text-text-primary">{top3[2].name}</h3>
                      <p className="text-text-secondary text-sm mb-2">{top3[2].rollNo || top3[2].branch}</p>
                      <p className="text-accent-blue text-xs font-bold mb-4">{getRankTitle(top3[2].correct, totalQuestionsWithAnswers)}</p>
                      <div className="bg-dark-600 px-4 py-2 rounded-lg w-full text-center">
                        <span className="font-bold text-lg text-amber-500">{top3[2].score} pts</span>
                        <div className="text-xs text-text-secondary mt-1">{top3[2].correct}/{totalQuestionsWithAnswers} {top3[2].streak >= 2 && '🔥'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Rest of the Leaderboard Table */}
              {others.length > 0 && (
                <div className="glass-card overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-dark-600/50 border-b border-glass-border">
                        <th className="p-4 text-text-secondary font-semibold uppercase text-xs tracking-wider">Rank</th>
                        <th className="p-4 text-text-secondary font-semibold uppercase text-xs tracking-wider">Student Name</th>
                        <th className="p-4 text-text-secondary font-semibold uppercase text-xs tracking-wider">Title</th>
                        <th className="p-4 text-text-secondary font-semibold uppercase text-xs tracking-wider text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-glass-border">
                      {others.map((student, i) => (
                        <tr key={i} className="hover:bg-dark-600/30 transition-colors">
                          <td className="p-4 text-text-secondary font-bold">#{i + 4}</td>
                          <td className="p-4 text-text-primary font-semibold">
                            {student.name} {student.streak >= 2 && '🔥'}
                            {student.rollNo && <span className="block text-xs text-text-secondary font-normal">{student.rollNo}</span>}
                          </td>
                          <td className="p-4 text-text-secondary text-sm">
                            {getRankTitle(student.correct, totalQuestionsWithAnswers)}
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-bold text-text-primary">{student.score} pts</span>
                            <span className="text-text-secondary text-xs block mt-1">{student.correct}/{totalQuestionsWithAnswers} correct</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            {/* Questions Breakdown */}
            <div className="mt-12 space-y-4">
              <h2 className="text-lg font-bold text-text-primary uppercase tracking-wider mb-4">Question Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allResults.map((poll, i) => {
                  const rTotal = poll.voters?.length || 0;
                  const correctVoters = poll.voters?.filter(v => v.vote === poll.correctOption)?.length || 0;
                  const accuracy = rTotal > 0 ? Math.round((correctVoters / rTotal) * 100) : 0;
                  
                  return (
                    <div key={i} className="glass-card p-5 border-l-4 border-l-accent-blue">
                      <h3 className="font-bold text-text-primary mb-1">{poll.resumeLabel}</h3>
                      <p className="text-sm text-text-secondary mb-3">
                        Correct Answer: <span className={`font-bold uppercase ${poll.correctOption === 'accept' ? 'text-accent-green' : poll.correctOption === 'reject' ? 'text-accent-red' : 'text-text-secondary'}`}>
                          {poll.correctOption || 'Not Set'}
                        </span>
                      </p>
                      
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-text-secondary">Accuracy</span>
                        <span className="font-bold text-text-primary">{accuracy}%</span>
                      </div>
                      <div className="w-full h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-accent-blue transition-all"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
