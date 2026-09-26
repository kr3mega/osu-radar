import React, { useState } from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { Sparkles, Edit2, Check } from 'lucide-react';
import { analyzeBeatmap } from '../../engine/analyzer';

// Embedded test fixtures for instant 1-click demo
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

export const Navbar: React.FC = () => {
  const { currentPool, setPoolMetadata, addBeatmaps, isAnalyzing, setIsAnalyzing } = usePoolStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(currentPool.name);
  const [stageInput, setStageInput] = useState(currentPool.stage || '');

  const handleSaveTitle = () => {
    setPoolMetadata(titleInput || 'Mappool Sem Título', stageInput);
    setIsEditingTitle(false);
  };

  const handleLoadDemoFixtures = async () => {
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
    <header className="sticky top-0 z-50 bg-osu-panel/95 backdrop-blur border-b border-osu-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-osu-surface border-2 border-osu-pink flex items-center justify-center shadow-glowPink">
            <svg viewBox="0 0 40 40" className="w-6 h-6 fill-none">
              <circle cx="20" cy="20" r="14" stroke="#ff66aa" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="20" y1="20" x2="31" y2="11" stroke="#00d8ff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="20" cy="20" r="3" fill="#ff66aa" />
              <circle cx="28" cy="14" r="2" fill="#00d8ff" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg tracking-tight text-white">osu!</span>
              <span className="font-extrabold text-lg tracking-tight text-osu-pink">Radar</span>
              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-osu-pink/20 text-osu-pink ml-1">
                WASM Edge
              </span>
            </div>
            <p className="text-[10px] text-osu-text-muted hidden sm:block">
              Auditoria Cinemática e Inteligência Competitiva de Torneios
            </p>
          </div>
        </div>

        {/* Center: Mappool Name & Stage Editor */}
        <div className="hidden md:flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                placeholder="Nome da Pool"
                className="px-2.5 py-1 text-xs rounded bg-osu-surface border border-osu-border text-white focus:outline-none focus:border-osu-pink"
              />
              <input
                type="text"
                value={stageInput}
                onChange={(e) => setStageInput(e.target.value)}
                placeholder="Estágio (ex: RO16, Finais)"
                className="px-2.5 py-1 text-xs rounded bg-osu-surface border border-osu-border text-white focus:outline-none focus:border-osu-pink w-36"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded bg-osu-pink text-white hover:bg-osu-pink/80"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => {
                setTitleInput(currentPool.name);
                setStageInput(currentPool.stage || '');
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-card bg-osu-surface/60 hover:bg-osu-surface border border-transparent hover:border-osu-border cursor-pointer transition-colors group"
            >
              <span className="text-xs font-bold text-white">{currentPool.name}</span>
              {currentPool.stage && (
                <span className="text-[11px] text-osu-text-muted font-normal">
                  • {currentPool.stage}
                </span>
              )}
              <Edit2 className="w-3 h-3 text-osu-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Loader Button */}
          <button
            type="button"
            onClick={handleLoadDemoFixtures}
            disabled={isAnalyzing}
            className="px-3 py-1.5 rounded-card bg-osu-surface hover:bg-osu-hover text-xs font-semibold text-osu-text-primary border border-osu-border flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            title="Carregar 3 mapas de referência instantaneamente para testar"
          >
            <Sparkles className="w-3.5 h-3.5 text-osu-cyan" />
            <span className="hidden sm:inline">Carregar</span> Demos
          </button>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-card bg-osu-surface hover:bg-osu-hover text-osu-text-muted hover:text-white border border-osu-border transition-colors"
            title="Repositório no GitHub"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
};
