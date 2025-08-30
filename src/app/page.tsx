'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PlayerStats {
  name: string;
  winners: number;
  unforced_errors: number;
  score: number;
}

interface StatEntry {
  point: number;
  playerIndex: number;
  stat: 'winners' | 'unforced_errors';
  timestamp: number;
}

interface MatchState {
  players: PlayerStats[];
  isGameStarted: boolean;
  statHistory: StatEntry[];
}

export default function Home() {
  const [matchState, setMatchState] = useState<MatchState>({
    players: [],
    isGameStarted: false,
    statHistory: [],
  });

  const [playerNames, setPlayerNames] = useState(['', '', '', '']);

  useEffect(() => {
    const savedState = localStorage.getItem('padelMatch');
    if (savedState) {
      setMatchState(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('padelMatch', JSON.stringify(matchState));
  }, [matchState]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!matchState.isGameStarted) return;

      const key = event.key;
      const keyMap = {
        '1': { playerIndex: 0, stat: 'winners' },
        '2': { playerIndex: 0, stat: 'unforced_errors' },
        '3': { playerIndex: 1, stat: 'winners' },
        '4': { playerIndex: 1, stat: 'unforced_errors' },
        '5': { playerIndex: 2, stat: 'winners' },
        '6': { playerIndex: 2, stat: 'unforced_errors' },
        '7': { playerIndex: 3, stat: 'winners' },
        '8': { playerIndex: 3, stat: 'unforced_errors' },
      } as const;

      if (key in keyMap) {
        const { playerIndex, stat } = keyMap[key as keyof typeof keyMap];
        incrementStat(playerIndex, stat);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [matchState.isGameStarted]);

  const startMatch = () => {
    if (playerNames.every(name => name.trim() !== '')) {
      setMatchState({
        players: playerNames.map(name => ({
          name: name.trim(),
          winners: 0,
          unforced_errors: 0,
          score: 0,
        })),
        isGameStarted: true,
        statHistory: [],
      });
    }
  };

  const incrementStat = (playerIndex: number, stat: 'winners' | 'unforced_errors') => {
    setMatchState(prev => {
      const statValue = stat === 'winners' ? 2 : -1;
      const newStatHistory = [...prev.statHistory, {
        point: prev.statHistory.length + 1,
        playerIndex,
        stat,
        timestamp: Date.now(),
      }];

      return {
        ...prev,
        statHistory: newStatHistory,
        players: prev.players.map((player, index) =>
          index === playerIndex
            ? { 
                ...player, 
                [stat]: player[stat] + 1,
                score: player.score + statValue
              }
            : player
        ),
      };
    });
  };

  const resetMatch = () => {
    if (window.confirm('Are you sure you want to reset the match? All statistics will be lost.')) {
      setMatchState({ players: [], isGameStarted: false, statHistory: [] });
      setPlayerNames(['', '', '', '']);
      localStorage.removeItem('padelMatch');
    }
  };

  const exportMatchData = () => {
    const dataToExport = {
      matchState,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `padel-match-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importMatchData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        
        if (importedData.matchState && importedData.matchState.players && Array.isArray(importedData.matchState.statHistory)) {
          setMatchState(importedData.matchState);
          if (window.confirm('Match data imported successfully! This will overwrite the current match.')) {
            localStorage.setItem('padelMatch', JSON.stringify(importedData.matchState));
          }
        } else {
          alert('Invalid file format. Please select a valid padel match export file.');
        }
      } catch (error) {
        alert('Error reading file. Please make sure it\'s a valid JSON file.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input value so the same file can be imported again
    event.target.value = '';
  };

  const getTeamStats = (teamIndex: number) => {
    if (!matchState.isGameStarted) return { winners: 0, unforced_errors: 0, score: 0 };
    
    const teamPlayers = teamIndex === 0 ? [0, 1] : [2, 3];
    return teamPlayers.reduce(
      (total, playerIndex) => ({
        winners: total.winners + matchState.players[playerIndex].winners,
        unforced_errors: total.unforced_errors + matchState.players[playerIndex].unforced_errors,
        score: total.score + matchState.players[playerIndex].score,
      }),
      { winners: 0, unforced_errors: 0, score: 0 }
    );
  };

  const getChartData = () => {
    const data: any[] = [];
    const playerScores: number[] = [0, 0, 0, 0];
    
    data.push({
      point: 0,
      zero: 0,
      [matchState.players[0]?.name || 'Player 1']: 0,
      [matchState.players[1]?.name || 'Player 2']: 0,
      [matchState.players[2]?.name || 'Player 3']: 0,
      [matchState.players[3]?.name || 'Player 4']: 0,
    });

    if (matchState.statHistory && matchState.statHistory.length > 0) {
      matchState.statHistory.forEach((entry) => {
        const statValue = entry.stat === 'winners' ? 2 : -1;
        playerScores[entry.playerIndex] += statValue;
        
        data.push({
          point: entry.point,
          zero: 0,
          [matchState.players[0]?.name || 'Player 1']: playerScores[0],
          [matchState.players[1]?.name || 'Player 2']: playerScores[1],
          [matchState.players[2]?.name || 'Player 3']: playerScores[2],
          [matchState.players[3]?.name || 'Player 4']: playerScores[3],
        });
      });
    }

    return data;
  };

  if (!matchState.isGameStarted) {
    return (
      <div className="min-h-screen p-8 bg-green-50">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-8 text-green-800">Padel Match Counter</h1>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-center">Enter Player Names</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-700">Team 1</h3>
                <input
                  type="text"
                  placeholder="Player 1"
                  value={playerNames[0]}
                  onChange={(e) => setPlayerNames(prev => prev.map((name, i) => i === 0 ? e.target.value : name))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Player 2"
                  value={playerNames[1]}
                  onChange={(e) => setPlayerNames(prev => prev.map((name, i) => i === 1 ? e.target.value : name))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-700">Team 2</h3>
                <input
                  type="text"
                  placeholder="Player 3"
                  value={playerNames[2]}
                  onChange={(e) => setPlayerNames(prev => prev.map((name, i) => i === 2 ? e.target.value : name))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Player 4"
                  value={playerNames[3]}
                  onChange={(e) => setPlayerNames(prev => prev.map((name, i) => i === 3 ? e.target.value : name))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={startMatch}
              disabled={!playerNames.every(name => name.trim() !== '')}
              className="w-full mt-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Start Match
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-green-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-green-800">Padel Match Counter</h1>
          <div className="flex gap-2">
            <button
              onClick={exportMatchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Export Data
            </button>
            <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
              Import Data
              <input
                type="file"
                accept=".json"
                onChange={importMatchData}
                className="hidden"
              />
            </label>
            <button
              onClick={resetMatch}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Reset Match
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-green-700 text-center">Team 1</h2>
                
                {matchState.players.slice(0, 2).map((player, index) => (
                  <div key={index} className="mb-6 last:mb-0">
                    <h3 className="text-lg font-medium mb-3">{player.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => incrementStat(index, 'winners')}
                        className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        W ({index * 2 + 1})
                      </button>
                      <button
                        onClick={() => incrementStat(index, 'unforced_errors')}
                        className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        UE ({index * 2 + 2})
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 text-center">
                      W: {player.winners} | UE: {player.unforced_errors} | Score: {player.score}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold mb-4 text-blue-700 text-center">Team 2</h2>
                
                {matchState.players.slice(2, 4).map((player, index) => (
                  <div key={index} className="mb-6 last:mb-0">
                    <h3 className="text-lg font-medium mb-3">{player.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => incrementStat(index + 2, 'winners')}
                        className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      >
                        W ({(index + 2) * 2 + 1})
                      </button>
                      <button
                        onClick={() => incrementStat(index + 2, 'unforced_errors')}
                        className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        UE ({(index + 2) * 2 + 2})
                      </button>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 text-center">
                      W: {player.winners} | UE: {player.unforced_errors} | Score: {player.score}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-center">Match Statistics</h2>
            
            <div className="space-y-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium text-green-700 mb-2">Team 1</h3>
                <div className="text-sm text-gray-600">
                  <div>Winners: {getTeamStats(0).winners}</div>
                  <div>Unforced Errors: {getTeamStats(0).unforced_errors}</div>
                  <div className="font-semibold">Score: {getTeamStats(0).score}</div>
                </div>
              </div>
              
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium text-blue-700 mb-2">Team 2</h3>
                <div className="text-sm text-gray-600">
                  <div>Winners: {getTeamStats(1).winners}</div>
                  <div>Unforced Errors: {getTeamStats(1).unforced_errors}</div>
                  <div className="font-semibold">Score: {getTeamStats(1).score}</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-center">Score Progression</h2>
          <div className="h-128">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="point" 
                  label={{ value: 'Point in Match', position: 'insideBottom', offset: -5 }}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                />
                <YAxis 
                  label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
                  axisLine={{ stroke: '#000', strokeWidth: 2 }}
                />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="zero" 
                  stroke="#000" 
                  strokeWidth={3}
                  strokeDasharray="0"
                  dot={false}
                  legendType="none"
                />
                <Line 
                  type="monotone" 
                  dataKey={matchState.players[0]?.name || 'Player 1'} 
                  stroke="#16a34a" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey={matchState.players[1]?.name || 'Player 2'} 
                  stroke="#15803d" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey={matchState.players[2]?.name || 'Player 3'} 
                  stroke="#2563eb" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey={matchState.players[3]?.name || 'Player 4'} 
                  stroke="#1d4ed8" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-center">
            Winners: +2 points | Unforced Errors: -1 point
          </div>
        </div>
      </div>
    </div>
  );
}
