'use client';

import { useState, useEffect } from 'react';
import { useLocalParticipant, useDataChannel } from '@livekit/components-react';

type Player = 'X' | 'O' | null;

interface GameState {
  board: Player[];
  xIsNext: boolean;
  winner: Player | 'Draw';
  resetRequest?: boolean;
}

export default function TicTacToe({ partnerName }: { partnerName: string }) {
  const { localParticipant } = useLocalParticipant();
  
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [mySymbol, setMySymbol] = useState<Player>(null);
  const [xIsNext, setXIsNext] = useState<boolean>(true);
  const [winner, setWinner] = useState<Player | 'Draw'>(null);
  
  const [scoreMe, setScoreMe] = useState(0);
  const [scorePartner, setScorePartner] = useState(0);

  const { send, message } = useDataChannel('tictactoe');

  useEffect(() => {
    if (!message) return;
    
    try {
      const decoder = new TextDecoder();
      const str = decoder.decode(message.payload);
      const data: GameState = JSON.parse(str);
      
      if (data.resetRequest) {
        setBoard(Array(9).fill(null));
        setWinner(null);
        setXIsNext(true);
        setMySymbol(null); 
        return;
      }

      setBoard(data.board);
      setXIsNext(data.xIsNext);
      setWinner(data.winner);

      if (data.winner) {
         if (data.winner === mySymbol) {
             // local win already handled
         } else if (data.winner !== 'Draw') {
             setScorePartner(s => s + 1);
         }
      }
    } catch (e) {
      console.error('Failed to parse tic-tac-toe message', e);
    }
  }, [message]);

  const checkWinner = (squares: Player[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    if (!squares.includes(null)) return 'Draw';
    return null;
  };

  const handleClick = (i: number) => {
    if (board[i] || winner) return;

    let currentSymbol = mySymbol;
    if (!currentSymbol) {
      currentSymbol = xIsNext ? 'X' : 'O';
      setMySymbol(currentSymbol);
    }

    if ((xIsNext && currentSymbol !== 'X') || (!xIsNext && currentSymbol !== 'O')) {
      return;
    }

    const newBoard = [...board];
    newBoard[i] = currentSymbol;
    
    const newWinner = checkWinner(newBoard);
    
    setBoard(newBoard);
    setXIsNext(!xIsNext);
    setWinner(newWinner);

    if (newWinner === currentSymbol) {
      setScoreMe(s => s + 1);
    }

    const state: GameState = {
      board: newBoard,
      xIsNext: !xIsNext,
      winner: newWinner
    };
    
    const encoder = new TextEncoder();
    send(encoder.encode(JSON.stringify(state)), { reliable: true });
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setXIsNext(true);
    setMySymbol(null);
    
    const encoder = new TextEncoder();
    send(encoder.encode(JSON.stringify({ resetRequest: true })), { reliable: true });
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="bg-black/40 backdrop-blur-md border border-[#f23c57]/30 p-6 md:p-8 rounded-3xl shadow-[0_0_50px_rgba(242,60,87,0.15)] flex flex-col items-center">
        
        <div className="flex w-full justify-between items-center mb-8 px-4 gap-8">
          <div className="flex flex-col items-center">
            <span className="text-[#f23c57] font-bold text-sm uppercase tracking-widest">Vous</span>
            <span className="text-3xl font-black text-white">{scoreMe}</span>
          </div>
          <div className="text-white/30 font-black text-xl">VS</div>
          <div className="flex flex-col items-center">
            <span className="text-white/70 font-bold text-sm uppercase tracking-widest truncate max-w-[80px]">{partnerName}</span>
            <span className="text-3xl font-black text-white">{scorePartner}</span>
          </div>
        </div>

        <div className="h-8 mb-4">
          {winner ? (
            <span className={`text-xl font-bold animate-pulse ${winner === 'Draw' ? 'text-white' : winner === mySymbol ? 'text-emerald-400' : 'text-red-500'}`}>
              {winner === 'Draw' ? 'Égalité !' : winner === mySymbol ? 'Vous avez gagné ! 🎉' : `${partnerName} a gagné !`}
            </span>
          ) : (
            <span className="text-white/60 font-medium">
              {mySymbol ? (
                (xIsNext && mySymbol === 'X') || (!xIsNext && mySymbol === 'O') ? 
                <span className="text-[#f23c57]">C'est à votre tour</span> : 
                `En attente de ${partnerName}...`
              ) : (
                "Jouez pour commencer"
              )}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 md:gap-3 bg-white/5 p-3 rounded-2xl">
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              disabled={!!winner || !!cell}
              className={`w-20 h-20 md:w-24 md:h-24 rounded-xl flex items-center justify-center text-5xl md:text-6xl font-black transition-all duration-300
                ${!cell && !winner ? 'hover:bg-white/10 active:scale-95 cursor-pointer bg-black/40' : 'bg-black/60'}
                ${cell === 'X' ? 'text-[#f23c57] shadow-[inset_0_0_20px_rgba(242,60,87,0.2)]' : cell === 'O' ? 'text-blue-400 shadow-[inset_0_0_20px_rgba(96,165,250,0.2)]' : ''}
              `}
            >
              {cell}
            </button>
          ))}
        </div>

        <div className={`mt-8 transition-all duration-500 ${winner ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
          <button 
            onClick={resetGame}
            className="px-6 py-3 bg-[#f23c57] hover:bg-[#ff0050] text-white font-bold rounded-full transition-transform active:scale-95 shadow-[0_0_20px_rgba(242,60,87,0.4)] flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined">replay</span>
            Rejouer
          </button>
        </div>
        
      </div>
    </div>
  );
}
