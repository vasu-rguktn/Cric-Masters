import React, { useState } from 'react';
import type { TossOutcome, TossRecord } from '../types/match';
import { flipCoin } from '../algorithms/tossGenerator';
import { getTossHistory } from '../services/storageService';
import { Dices, RotateCcw, CheckCircle2 } from 'lucide-react';

interface TossCoinProps {
  onTossComplete?: (outcome: TossOutcome) => void;
}

export const TossCoin: React.FC<TossCoinProps> = ({ onTossComplete }) => {
  const [history, setHistory] = useState<TossRecord[]>(() => getTossHistory());
  const [result, setResult] = useState<TossOutcome | null>(null);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);

  const handleFlip = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setResult(null);

    setTimeout(() => {
      const outcome = flipCoin();
      setResult(outcome);
      setIsFlipping(false);
      setHistory(getTossHistory());
      if (onTossComplete) {
        onTossComplete(outcome);
      }
    }, 1000);
  };

  return (
    <div className="bg-stadium-900 border border-stadium-800 rounded-3xl p-5 shadow-2xl text-center space-y-4 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stadium-800 pb-3">
        <div className="flex items-center space-x-2">
          <Dices className="w-5 h-5 text-turf-400" />
          <h3 className="font-extrabold text-white text-base tracking-wider">
            GROUND COIN TOSS
          </h3>
        </div>
        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-stadium-800 border border-stadium-700 text-stadium-300 uppercase tracking-widest">
          Max 2 Streak Rule Active
        </span>
      </div>

      {/* Coin Animation Container */}
      <div className="py-4 flex flex-col items-center justify-center space-y-3 min-h-[160px]">
        <div
          onClick={handleFlip}
          className={`w-32 h-32 rounded-full cursor-pointer transition-all duration-300 flex items-center justify-center shadow-2xl relative border-4 border-turf-400/40 select-none ${
            isFlipping
              ? 'animate-spin-fast bg-gradient-to-tr from-gold-600 via-gold-400 to-gold-300'
              : result === 'HEADS'
              ? 'bg-gradient-to-br from-turf-600 via-turf-500 to-emerald-400 scale-105 shadow-turf-500/40'
              : result === 'TAILS'
              ? 'bg-gradient-to-br from-gold-600 via-gold-500 to-amber-400 scale-105 shadow-gold-500/40'
              : 'bg-gradient-to-br from-stadium-800 via-stadium-700 to-stadium-800 hover:scale-105'
          }`}
        >
          <div className="text-center space-y-0.5">
            {isFlipping ? (
              <span className="text-xl font-black text-stadium-950 tracking-widest">FLIPPING...</span>
            ) : result ? (
              <>
                <div className="text-2xl font-black text-stadium-950 tracking-wider drop-shadow-md">
                  {result}
                </div>
                <div className="text-[9px] font-extrabold text-stadium-950/80 uppercase">
                  Toss Winner Call
                </div>
              </>
            ) : (
              <>
                <div className="text-lg font-black text-white tracking-widest">TOSS</div>
                <div className="text-[9px] font-bold text-stadium-300 uppercase">Tap to Flip</div>
              </>
            )}
          </div>
        </div>

        {result && (
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-turf-500/20 border border-turf-500/40 text-turf-400 text-xs font-bold animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-turf-400" />
            <span>RESULT: {result}</span>
          </div>
        )}
      </div>

      {/* Big Flip Coin Button */}
      <button
        onClick={handleFlip}
        disabled={isFlipping}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-turf-500 via-turf-600 to-emerald-600 text-stadium-950 font-black text-base tracking-wider shadow-xl shadow-turf-500/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
      >
        <RotateCcw className={`w-5 h-5 ${isFlipping ? 'animate-spin' : ''}`} />
        <span>{isFlipping ? 'FLIPPING COIN...' : 'FLIP COIN'}</span>
      </button>

      {/* Toss History */}
      {history.length > 0 && (
        <div className="pt-3 border-t border-stadium-800 space-y-1.5">
          <div className="text-[10px] font-extrabold text-stadium-400 uppercase tracking-widest">
            Previous Tosses
          </div>
          <div className="flex items-center justify-center space-x-1.5 overflow-x-auto py-1">
            {history.slice(0, 7).map((item) => (
              <span
                key={item.id}
                className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                  item.outcome === 'HEADS'
                    ? 'bg-turf-500/20 text-turf-400 border-turf-500/30'
                    : 'bg-gold-500/20 text-gold-400 border-gold-500/30'
                }`}
              >
                {item.outcome === 'HEADS' ? 'H' : 'T'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
