import React from 'react';
import { usePoolStore } from '../../store/usePoolStore';
import { ModSlotBadge } from './ModSlotBadge';
import { StatHexagon } from '../charts/StatHexagon';
import { StrainTimeline } from '../charts/StrainTimeline';
import { formatTimestamp } from '../../engine/strains';
import { X, ExternalLink, Activity } from 'lucide-react';
import { SkillAttributes } from '../../engine/types';

interface BeatmapDetailModalProps {
  onClose: () => void;
}

export const BeatmapDetailModal: React.FC<BeatmapDetailModalProps> = ({ onClose }) => {
  const { currentPool, selectedMapId, updateModSlot } = usePoolStore();
  const map = currentPool.maps.find((m) => m.id === selectedMapId);

  if (!map) return null;

  // Calculate pool average for comparison
  const avgSkills: SkillAttributes = {
    snapAim: 0,
    flowAim: 0,
    speed: 0,
    stamina: 0,
    fingerControl: 0,
    readingTech: 0,
  };

  const poolCount = currentPool.maps.length;
  if (poolCount > 0) {
    for (const m of currentPool.maps) {
      avgSkills.snapAim += m.skills.snapAim;
      avgSkills.flowAim += m.skills.flowAim;
      avgSkills.speed += m.skills.speed;
      avgSkills.stamina += m.skills.stamina;
      avgSkills.fingerControl += m.skills.fingerControl;
      avgSkills.readingTech += m.skills.readingTech;
    }
    (Object.keys(avgSkills) as Array<keyof SkillAttributes>).forEach((k) => {
      avgSkills[k] = Math.round((avgSkills[k] / poolCount) * 10) / 10;
    });
  }

  const { metadata, stats, difficulty, skills, timeline, modSlot } = map;
  const coverUrl = metadata.beatmapSetId
    ? `https://assets.ppy.sh/beatmaps/${metadata.beatmapSetId}/covers/cover.jpg`
    : null;

  const modSlotOptions = ['NM1', 'NM2', 'NM3', 'NM4', 'NM5', 'NM6', 'HD1', 'HD2', 'HD3', 'HR1', 'HR2', 'HR3', 'DT1', 'DT2', 'DT3', 'DT4', 'FM1', 'FM2', 'FM3', 'TB'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-osu-panel border border-osu-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Banner Header */}
        <div className="relative h-44 flex-shrink-0 overflow-hidden bg-osu-base">
          {coverUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${coverUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-osu-surface to-osu-panel opacity-60" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-osu-panel via-osu-panel/80 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/80 hover:text-white transition-colors z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Banner details */}
          <div className="absolute bottom-4 left-6 right-6 z-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ModSlotBadge slot={modSlot} size="md" />
                <span className="text-xs font-bold uppercase text-osu-pink tracking-wider">
                  {metadata.artist}
                </span>
                {metadata.beatmapId && (
                  <a
                    href={`https://osu.ppy.sh/b/${metadata.beatmapId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-osu-cyan hover:underline flex items-center gap-1 ml-2"
                  >
                    <span>#{metadata.beatmapId}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <h1 className="text-2xl font-black text-white leading-tight">
                {metadata.title}{' '}
                <span className="text-osu-text-secondary font-medium text-lg">
                  [{metadata.version}]
                </span>
              </h1>
              <p className="text-xs text-osu-text-muted mt-0.5">
                Mapeado por <span className="text-white font-medium">{metadata.creator}</span>
              </p>
            </div>

            {/* Star Rating Badge */}
            <div className="px-3.5 py-1.5 bg-yellow-500/20 border border-yellow-500/50 rounded-pill text-yellow-400 font-extrabold text-sm flex items-center gap-1.5 shadow-lg">
              <span>★</span>
              <span>{stats.starRating.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
          {/* Top Actions: Slot Selector & Difficulty Badges */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-osu-surface/60 rounded-card border border-osu-border text-xs">
            <div className="flex items-center gap-2">
              <span className="text-osu-text-muted font-bold uppercase text-[10px]">Slot na Pool:</span>
              <select
                value={modSlot || 'NM1'}
                onChange={(e) => updateModSlot(map.id, e.target.value)}
                className="px-2.5 py-1 rounded bg-osu-panel border border-osu-border text-white font-bold focus:outline-none focus:border-osu-pink"
              >
                {modSlotOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-4 text-osu-text-secondary font-mono">
              <span>CS: <strong className="text-white">{difficulty.cs.toFixed(1)}</strong></span>
              <span>AR: <strong className="text-white">{difficulty.ar.toFixed(1)}</strong></span>
              <span>OD: <strong className="text-white">{difficulty.od.toFixed(1)}</strong></span>
              <span>HP: <strong className="text-white">{difficulty.hp.toFixed(1)}</strong></span>
              <span>BPM: <strong className="text-white">{stats.bpmMode}</strong></span>
              <span>Drain: <strong className="text-white">{formatTimestamp(stats.drainTimeMs)}</strong></span>
              <span>Combo Máx: <strong className="text-white">{stats.maxCombo}x</strong></span>
            </div>
          </div>

          {/* Hexagon Radar + Kinematic Channels Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Hexagon (with pool comparison) */}
            <div className="md:col-span-6 flex flex-col items-center p-4 bg-osu-base/60 rounded-card border border-osu-border">
              <span className="text-xs font-bold uppercase tracking-wider text-osu-text-secondary mb-2">
                Hexágono de Atributos (vs. Média da Pool)
              </span>
              <StatHexagon
                skills={skills}
                comparisonSkills={poolCount > 1 ? avgSkills : undefined}
                comparisonLabel="Média da Pool"
                size={290}
                showLegend={true}
              />
            </div>

            {/* Kinematic Explanations & Deep Channel Stats */}
            <div className="md:col-span-6 flex flex-col gap-3 text-xs">
              <div className="flex items-center gap-2 text-osu-pink font-bold uppercase text-xs">
                <Activity className="w-4 h-4" />
                <span>Auditoria Cinemática dos 4 Canais</span>
              </div>

              <div className="space-y-2">
                {/* Canal 1: Temporal */}
                <div className="p-2.5 bg-osu-surface/60 rounded border border-osu-border flex flex-col gap-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-osu-cyan">Canal 1: Ritmo & Frequência</span>
                    <span className="text-osu-pink">Finger Ctrl: {skills.fingerControl.toFixed(1).replace('.', ',')}%</span>
                  </div>
                  <p className="text-[11px] text-osu-text-muted">
                    Avalia cadência de batida, transições de snapping (1/2, 1/4, 1/3) e entropia temporal para isolar alternância pura.
                  </p>
                </div>

                {/* Canal 2: Espacial */}
                <div className="p-2.5 bg-osu-surface/60 rounded border border-osu-border flex flex-col gap-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-osu-cyan">Canal 2: Espaçamento & Velocidade</span>
                    <span className="text-osu-pink">Aim Strain: {((skills.snapAim + skills.flowAim) / 2).toFixed(1).replace('.', ',')}%</span>
                  </div>
                  <p className="text-[11px] text-osu-text-muted">
                    Mede deslocamento físico em pixels e velocidade instantânea do cursor (px/ms) entre notas sucessivas.
                  </p>
                </div>

                {/* Canal 3: Angular */}
                <div className="p-2.5 bg-osu-surface/60 rounded border border-osu-border flex flex-col gap-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-osu-cyan">Canal 3: Deflexão Angular (θ)</span>
                    <span className="text-osu-pink">Snap: {skills.snapAim.toFixed(1).replace('.', ',')}% | Flow: {skills.flowAim.toFixed(1).replace('.', ',')}%</span>
                  </div>
                  <p className="text-[11px] text-osu-text-muted">
                    Diferencia saltos agudos com parada brusca (&theta; &gt; 100°) de arcos circulares contínuos (&theta; &le; 65°).
                  </p>
                </div>

                {/* Canal 4: Tech & SV */}
                <div className="p-2.5 bg-osu-surface/60 rounded border border-osu-border flex flex-col gap-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-osu-cyan">Canal 4: Sliders & Leitura Visual</span>
                    <span className="text-osu-pink">Tech / Reading: {skills.readingTech.toFixed(1).replace('.', ',')}%</span>
                  </div>
                  <p className="text-[11px] text-osu-text-muted">
                    Mapeia variações bruscas de Slider Velocity (&Delta;SV), curvatura de sliders e sobreposições dentro da janela de AR.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Strain Timeline Chart (Pontos de Tensão) */}
          <div className="rounded-card overflow-hidden">
            <StrainTimeline
              timeline={timeline}
              height={140}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
