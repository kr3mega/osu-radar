import React, { useState } from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { Search, Sparkles, Volume2 } from 'lucide-react';
import { analyzeBeatmap } from '../../engine/analyzer';

interface LazerToolbarProps {
  activeTab: 'select' | 'overview';
  onTabChange: (tab: 'select' | 'overview') => void;
}

// Embedded demo fixtures
const DEMO_FIXTURES = [
  {
    name: 'NM1_Jump_Showcase.osu',
    text: `osu file format v14
[General]
AudioFilename: audio.mp3
Mode: 0
[Metadata]
Title: Jump Training Showcase
Artist: Antigravity
Creator: Tester
Version: NM1 Jump Fixture
BeatmapID: 100001
BeatmapSetID: 50001
[Difficulty]
HPDrainRate:6
CircleSize:4
OverallDifficulty:8
ApproachRate:9.5
SliderMultiplier:1.4
SliderTickRate:1
[TimingPoints]
0,300,4,2,0,100,1,0
[HitObjects]
100,100,1000,1,0,0:0:0:0:
400,300,1150,1,0,0:0:0:0:
100,300,1300,1,0,0:0:0:0:
400,100,1450,1,0,0:0:0:0:
100,100,1600,1,0,0:0:0:0:
400,300,1750,1,0,0:0:0:0:
100,300,1900,1,0,0:0:0:0:
400,100,2050,1,0,0:0:0:0:
100,100,2200,1,0,0:0:0:0:
400,300,2350,1,0,0:0:0:0:
100,300,2500,1,0,0:0:0:0:
400,100,2650,1,0,0:0:0:0:
100,100,2800,1,0,0:0:0:0:
400,300,2950,1,0,0:0:0:0:
100,300,3100,1,0,0:0:0:0:
400,100,3250,1,0,0:0:0:0:
100,100,3400,1,0,0:0:0:0:
400,300,3550,1,0,0:0:0:0:
100,300,3700,1,0,0:0:0:0:
400,100,3850,1,0,0:0:0:0:
100,100,4000,1,0,0:0:0:0:
400,300,4150,1,0,0:0:0:0:
100,300,4300,1,0,0:0:0:0:
400,100,4450,1,0,0:0:0:0:
`,
  },
  {
    name: 'DT1_Speed_Stream.osu',
    text: `osu file format v14
[General]
AudioFilename: audio.mp3
Mode: 0
[Metadata]
Title: Deathstream Stamina Showcase
Artist: Antigravity
Creator: Tester
Version: DT1 Speed Stream Fixture
BeatmapID: 100002
BeatmapSetID: 50002
[Difficulty]
HPDrainRate:7
CircleSize:4.2
OverallDifficulty:9
ApproachRate:9.6
SliderMultiplier:1.4
SliderTickRate:1
[TimingPoints]
0,300,4,2,0,100,1,0
[HitObjects]
256,192,1000,1,0,0:0:0:0:
266,192,1075,1,0,0:0:0:0:
276,192,1150,1,0,0:0:0:0:
286,192,1225,1,0,0:0:0:0:
296,192,1300,1,0,0:0:0:0:
306,192,1375,1,0,0:0:0:0:
316,192,1450,1,0,0:0:0:0:
326,192,1525,1,0,0:0:0:0:
336,192,1600,1,0,0:0:0:0:
346,192,1675,1,0,0:0:0:0:
356,192,1750,1,0,0:0:0:0:
366,192,1825,1,0,0:0:0:0:
376,192,1900,1,0,0:0:0:0:
386,192,1975,1,0,0:0:0:0:
396,192,2050,1,0,0:0:0:0:
406,192,2125,1,0,0:0:0:0:
416,192,2200,1,0,0:0:0:0:
426,192,2275,1,0,0:0:0:0:
436,192,2350,1,0,0:0:0:0:
446,192,2425,1,0,0:0:0:0:
436,192,2500,1,0,0:0:0:0:
426,192,2575,1,0,0:0:0:0:
416,192,2650,1,0,0:0:0:0:
406,192,2725,1,0,0:0:0:0:
396,192,2800,1,0,0:0:0:0:
386,192,2875,1,0,0:0:0:0:
376,192,2950,1,0,0:0:0:0:
366,192,3025,1,0,0:0:0:0:
356,192,3100,1,0,0:0:0:0:
346,192,3175,1,0,0:0:0:0:
336,192,3250,1,0,0:0:0:0:
326,192,3325,1,0,0:0:0:0:
316,192,3400,1,0,0:0:0:0:
306,192,3475,1,0,0:0:0:0:
`,
  },
  {
    name: 'TB_Tech_Camellia.osu',
    text: `osu file format v14
[General]
AudioFilename: audio.mp3
Mode: 0
[Metadata]
Title: Camellia Tech Gimmick
Artist: Antigravity
Creator: Tester
Version: TB Tech Fixture
BeatmapID: 100003
BeatmapSetID: 50003
[Difficulty]
HPDrainRate:6.5
CircleSize:4.5
OverallDifficulty:8.5
ApproachRate:8.0
SliderMultiplier:1.8
SliderTickRate:1
[TimingPoints]
0,352.94,4,2,0,100,1,0
1000,-50,4,2,0,100,0,0
2000,-150,4,2,0,100,0,0
3000,-35,4,2,0,100,0,0
[HitObjects]
256,192,1000,2,0,B|200:150|256:100|320:150|256:192,1,280
256,192,1352,2,0,B|150:250|256:300|350:250|256:192,1,320
200,200,1705,1,0,0:0:0:0:
210,205,1822,1,0,0:0:0:0:
220,210,1940,1,0,0:0:0:0:
256,192,2058,2,0,B|300:100|180:150|320:250|256:192,2,380
256,192,2764,1,0,0:0:0:0:
256,192,3000,2,0,B|400:100|100:150|400:300|256:192,1,450
`,
  },
];

export const LazerToolbar: React.FC<LazerToolbarProps> = ({ activeTab, onTabChange }) => {
  const { searchQuery, setSearchQuery, isAnalyzing, setIsAnalyzing, addBeatmaps } = usePoolStore();
  const [pulse, setPulse] = useState(false);

  const handleCookieClick = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 300);
  };

  const handleLoadDemos = async () => {
    setIsAnalyzing(true);
    try {
      const results = [];
      for (const fix of DEMO_FIXTURES) {
        const res = await analyzeBeatmap(fix.text, fix.name);
        results.push(res);
      }
      await addBeatmaps(results);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <nav className="relative z-40 bg-[#120819] border-b border-white/10 h-12 flex items-center justify-between px-3 sm:px-6 select-none shadow-md">
      {/* Left: osu! cookie logo & Navigation Tabs */}
      <div className="flex items-center gap-3 sm:gap-6 h-full">
        {/* The Iconic osu! Pink Cookie Button */}
        <button
          type="button"
          onClick={handleCookieClick}
          className={`relative group w-9 h-9 rounded-full bg-gradient-to-br from-[#ff66aa] to-[#d6337a] flex items-center justify-center shadow-lg transition-transform duration-150 active:scale-90 ${
            pulse ? 'scale-110 shadow-glowPink ring-2 ring-white' : 'hover:scale-105'
          }`}
          title="osu! — Clique para pulsar"
        >
          {/* Concentric white rings */}
          <span className="absolute inset-1 rounded-full border border-white/40 pointer-events-none" />
          <span className="font-extrabold text-white text-xs tracking-tighter drop-shadow-sm font-torus">
            osu!
          </span>
        </button>

        {/* Slanted Navigation Tabs (osu!lazer style) */}
        <div className="flex items-center h-full">
          <button
            type="button"
            onClick={() => onTabChange('select')}
            className={`relative px-4 h-full flex items-center font-bold text-xs uppercase tracking-wider transition-colors ${
              activeTab === 'select'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>Song Select</span>
            {activeTab === 'select' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-osu-pink shadow-glowPink rounded-t" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onTabChange('overview')}
            className={`relative px-4 h-full flex items-center font-bold text-xs uppercase tracking-wider transition-colors ${
              activeTab === 'overview'
                ? 'text-white'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>Pool Radar</span>
            {activeTab === 'overview' && (
              <span className="absolute bottom-0 left-0 right-0 h-1 bg-osu-pink shadow-glowPink rounded-t" />
            )}
          </button>
        </div>
      </div>

      {/* Right: Quick Demos, Search, Audio spectrum icon, and Profile Badge */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* 1-Click Load Demos */}
        <button
          type="button"
          onClick={handleLoadDemos}
          disabled={isAnalyzing}
          className="px-2.5 py-1 rounded bg-[#251532] hover:bg-[#341d45] border border-osu-pink/30 hover:border-osu-pink text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
          title="Carregar 3 mapas de referência (Jump, Speed, Tech)"
        >
          <Sparkles className="w-3.5 h-3.5 text-osu-pink" />
          <span className="hidden sm:inline">Demos</span>
        </button>

        {/* Search input (lazer pill style) */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to search..."
            className="pl-8 pr-3 py-1 text-xs rounded-full bg-[#1e0e29] border border-white/10 text-white placeholder-white/40 focus:outline-none focus:border-osu-pink w-32 sm:w-48 transition-all"
          />
        </div>

        {/* Music visualizer bars */}
        <div className="hidden lg:flex items-center gap-1 px-2 text-osu-cyan">
          <Volume2 className="w-4 h-4 text-white/50" />
          <div className="flex items-end gap-0.5 h-3">
            <span className="w-0.5 bg-osu-cyan h-2 animate-pulse" />
            <span className="w-0.5 bg-osu-pink h-3 animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 bg-osu-cyan h-1.5 animate-pulse" style={{ animationDelay: '300ms' }} />
            <span className="w-0.5 bg-white h-2.5 animate-pulse" style={{ animationDelay: '450ms' }} />
          </div>
        </div>

        {/* Profile Card (osu!lazer style) */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-7 h-7 rounded-full bg-osu-surface border border-osu-pink flex items-center justify-center font-bold text-[10px] text-white overflow-hidden shadow-sm">
            🇧🇷
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-[11px] font-bold text-white leading-none">Capitão</span>
            <span className="text-[9px] font-mono text-osu-cyan leading-tight mt-0.5">#1 • 6WC</span>
          </div>
        </div>
      </div>
    </nav>
  );
};
