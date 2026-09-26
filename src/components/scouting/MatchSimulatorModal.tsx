import React, { useState } from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { TeamProfile, simulateFullMatch } from '../../engine/scouting';
import { generateMatchScrimReport } from '../../engine/reporter';
import { X, Swords, ShieldBan, Trophy, Copy, Check } from 'lucide-react';

interface MatchSimulatorModalProps {
  onClose: () => void;
}

// Default team presets based on the 6WC (Brasil B vs EUA B) from the original match log!
const DEFAULT_TEAM_RED: TeamProfile = {
  id: 'team-brazil-b',
  name: 'Brasil B',
  countryCode: 'BR',
  flag: '🇧🇷',
  color: 'red',
  roster: [
    {
      id: 'p-1',
      username: 'Sayo C8H18',
      rank: 1200,
      badges: 4,
      country: 'BR',
      skills: { snapAim: 82, flowAim: 88, speed: 76, stamina: 78, fingerControl: 90, readingTech: 86 },
      consistencyScore: 85,
    },
    {
      id: 'p-2',
      username: 'AlemaoG',
      rank: 2100,
      badges: 2,
      country: 'BR',
      skills: { snapAim: 86, flowAim: 82, speed: 80, stamina: 75, fingerControl: 84, readingTech: 80 },
      consistencyScore: 82,
    },
    {
      id: 'p-3',
      username: 'AugustoDroid',
      rank: 3500,
      badges: 1,
      country: 'BR',
      skills: { snapAim: 80, flowAim: 84, speed: 72, stamina: 70, fingerControl: 92, readingTech: 88 },
      consistencyScore: 88,
    },
  ],
  aggregatedSkills: { snapAim: 83, flowAim: 85, speed: 76, stamina: 74, fingerControl: 89, readingTech: 85 },
};

const DEFAULT_TEAM_BLUE: TeamProfile = {
  id: 'team-usa-b',
  name: 'United States B',
  countryCode: 'US',
  flag: '🇺🇸',
  color: 'blue',
  roster: [
    {
      id: 'p-4',
      username: 'he barks for me',
      rank: 800,
      badges: 5,
      country: 'US',
      skills: { snapAim: 92, flowAim: 78, speed: 94, stamina: 88, fingerControl: 75, readingTech: 72 },
      consistencyScore: 90,
    },
    {
      id: 'p-5',
      username: 'ityoluckyday',
      rank: 1500,
      badges: 3,
      country: 'US',
      skills: { snapAim: 90, flowAim: 76, speed: 90, stamina: 84, fingerControl: 78, readingTech: 70 },
      consistencyScore: 86,
    },
    {
      id: 'p-6',
      username: 'Dire_Spidar',
      rank: 1900,
      badges: 2,
      country: 'US',
      skills: { snapAim: 88, flowAim: 80, speed: 86, stamina: 82, fingerControl: 74, readingTech: 75 },
      consistencyScore: 84,
    },
  ],
  aggregatedSkills: { snapAim: 90, flowAim: 78, speed: 90, stamina: 85, fingerControl: 76, readingTech: 72 },
};

export const MatchSimulatorModal: React.FC<MatchSimulatorModalProps> = ({ onClose }) => {
  const { currentPool } = usePoolStore();
  const [teamRed] = useState<TeamProfile>(DEFAULT_TEAM_RED);
  const [teamBlue] = useState<TeamProfile>(DEFAULT_TEAM_BLUE);
  const [bestOf, setBestOf] = useState<number>(11);
  const [copied, setCopied] = useState<boolean>(false);

  const simulation = simulateFullMatch(currentPool.maps, teamRed, teamBlue, bestOf);

  const handleCopyReport = async () => {
    const md = generateMatchScrimReport(simulation);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-[#1a0c24] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#14081c] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-osu-pink" />
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Simulador de Confronto & Inteligência de Bans
              </h2>
              <p className="text-[11px] text-white/50">
                Cruzamento de vetores de habilidade dos times contra a física da mappool
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Teams Header Card */}
          <div className="grid grid-cols-1 md:grid-cols-11 items-center gap-4 p-4 rounded-xl bg-[#120718] border border-white/5">
            {/* Team Red */}
            <div className="md:col-span-5 flex items-center gap-3">
              <span className="text-3xl">{teamRed.flag}</span>
              <div>
                <span className="text-[10px] font-bold uppercase text-red-400 tracking-wider">Equipe Vermelha</span>
                <h3 className="text-lg font-black text-white">{teamRed.name}</h3>
                <span className="text-xs text-white/60">Especialidade: Flow & Finger Control</span>
              </div>
            </div>

            {/* VS & Score Banner */}
            <div className="md:col-span-1 text-center font-black text-lg text-osu-pink">
              VS
            </div>

            {/* Team Blue */}
            <div className="md:col-span-5 flex items-center justify-end gap-3 text-right">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-400 tracking-wider">Equipe Azul</span>
                <h3 className="text-lg font-black text-white">{teamBlue.name}</h3>
                <span className="text-xs text-white/60">Especialidade: Speed & Snap Aim</span>
              </div>
              <span className="text-3xl">{teamBlue.flag}</span>
            </div>
          </div>

          {/* Simulation Outcome & Prediction Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-[#180a22] to-blue-950/40 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-400 flex-shrink-0" />
              <div>
                <span className="text-xs uppercase font-bold text-white/60">Previsão do Confronto ({simulation.predictedScoreBestOf.format})</span>
                <h4 className="text-lg font-black text-white">
                  Vitória provável do{' '}
                  <span className={simulation.predictedScoreBestOf.winner === 'red' ? 'text-red-400' : 'text-blue-400'}>
                    {simulation.predictedScoreBestOf.winner === 'red' ? teamRed.name : teamBlue.name}
                  </span>{' '}
                  ({simulation.predictedScoreBestOf.redWins} - {simulation.predictedScoreBestOf.blueWins})
                </h4>
              </div>
            </div>

            {/* Best Of Format Selector */}
            <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/10 text-xs">
              <span className="text-white/60 font-medium">Formato:</span>
              {[7, 9, 11, 13].map((bo) => (
                <button
                  key={bo}
                  type="button"
                  onClick={() => setBestOf(bo)}
                  className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                    bestOf === bo ? 'bg-osu-pink text-white shadow-glowPink' : 'text-white/60 hover:text-white'
                  }`}
                >
                  BO{bo}
                </button>
              ))}
            </div>
          </div>

          {/* Strategic Bans & Counter-Picks Advice */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bans for Red */}
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <ShieldBan className="w-4 h-4" />
                <span>Bans Recomendados para {teamRed.name}</span>
              </div>
              <p className="text-xs text-white/70">
                Elimine os slots onde o adversário tem maior domínio mecânico:
              </p>
              <div className="flex items-center gap-2 mt-1">
                {simulation.recommendedBansRed.map((slot) => (
                  <span key={slot} className="px-2.5 py-1 rounded bg-red-500/20 border border-red-500/40 text-red-300 font-black text-xs">
                    BAN: {slot}
                  </span>
                ))}
              </div>
            </div>

            {/* Bans for Blue */}
            <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                <ShieldBan className="w-4 h-4" />
                <span>Bans Recomendados para {teamBlue.name}</span>
              </div>
              <p className="text-xs text-white/70">
                Neutralize os pontos fortes do {teamRed.name}:
              </p>
              <div className="flex items-center gap-2 mt-1">
                {simulation.recommendedBansBlue.map((slot) => (
                  <span key={slot} className="px-2.5 py-1 rounded bg-blue-500/20 border border-blue-500/40 text-blue-300 font-black text-xs">
                    BAN: {slot}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Map by Map Head-to-Head Table */}
          <div className="flex flex-col gap-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white/70">
              Probabilidade de Vitória Mapa a Mapa (ScoreV2)
            </h4>

            <div className="flex flex-col gap-2">
              {simulation.confrontations.map((conf) => {
                return (
                  <div
                    key={conf.mapId}
                    className="p-3 rounded-lg bg-[#120718] border border-white/5 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded font-black text-[11px] bg-white/10 text-white">
                          {conf.modSlot}
                        </span>
                        <span className="font-bold text-white truncate max-w-xs sm:max-w-md">{conf.title}</span>
                      </div>

                      <span className="text-[11px] text-white/60">
                        {conf.keyFactor}
                      </span>
                    </div>

                    {/* Win Probability Bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-red-400 w-12 text-right">
                        {conf.redWinProbability}%
                      </span>

                      <div className="flex-1 h-2 rounded-full bg-black/60 overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-red-600 to-red-400"
                          style={{ width: `${conf.redWinProbability}%` }}
                        />
                        <div
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                          style={{ width: `${conf.blueWinProbability}%` }}
                        />
                      </div>

                      <span className="text-[11px] font-mono font-bold text-blue-400 w-12">
                        {conf.blueWinProbability}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer with Discord Report Copy */}
        <div className="px-6 py-3 border-t border-white/10 bg-[#14081c] flex items-center justify-between">
          <span className="text-xs text-white/50">
            Relatório analítico determinístico baseado nos vetores de skill de ScoreV2
          </span>

          <button
            type="button"
            onClick={handleCopyReport}
            className="px-3.5 py-1.5 rounded-lg bg-osu-pink hover:bg-osu-pink/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-glowPink transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Relatório Copiado!' : 'Copiar Relatório Completo'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
