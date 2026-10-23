import { describe, it, expect, beforeEach } from 'vitest';
import { usePoolStore, getFilteredAndSortedMaps } from '../src/store/usePoolStore';
import { BeatmapAnalysisResult, Mappool } from '../src/engine/types';

describe('Mecanismo de Importação e Exportação & Estabilidade de Estado', () => {
  beforeEach(() => {
    usePoolStore.setState({
      currentPool: {
        id: 'test-pool',
        name: 'Torneio Teste 2026',
        stage: 'Qualifiers',
        description: 'Pool de testes automatizados',
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        maps: [],
      },
      selectedMapId: null,
      filterMod: 'ALL',
      filterTournament: 'ALL',
      filterStage: 'ALL',
      searchQuery: '',
      sortBy: 'slot',
      sortDirection: 'asc',
      activeTournamentFilter: null,
    });
  });

  const createMockMap = (
    id: string,
    slot: string,
    tournament: string,
    stage: string,
    sr: number
  ): BeatmapAnalysisResult => ({
    id,
    fileName: `${slot}_${id}.osu`,
    metadata: {
      title: `Music ${id}`,
      artist: `Artist ${id}`,
      creator: 'Mapper',
      version: `Diff ${slot}`,
      beatmapId: parseInt(id.replace(/\D/g, '') || '100', 10),
      beatmapSetId: 1000,
    },
    difficulty: { cs: 4, hp: 5, od: 8, ar: 9, sliderMultiplier: 1.4, sliderTickRate: 1 },
    stats: {
      starRating: sr,
      bpmMin: 180,
      bpmMax: 180,
      bpmMode: 180,
      durationMs: 120000,
      drainTimeMs: 110000,
      circleCount: 500,
      sliderCount: 200,
      spinnerCount: 1,
      totalObjects: 701,
      maxCombo: 1100,
    },
    skills: {
      snapAim: 65,
      flowAim: 50,
      speed: 70,
      stamina: 40,
      fingerControl: 55,
      readingTech: 30,
    },
    timeline: [],
    patterns: [],
    topSkills: ['speed', 'snapAim'],
    modSlot: slot,
    tournamentName: tournament,
    stageName: stage,
    calculatedAt: Date.now(),
  });

  it('exporta a pool para JSON seguro e serializável sem estourar memória', () => {
    const store = usePoolStore.getState();
    const map1 = createMockMap('map1', 'NM1', 'Torneio A', 'Qualifiers', 5.8);
    // Simula áudio blob temporário
    map1.audioBlob = new Blob(['fake audio'], { type: 'audio/mpeg' });
    map1.audioUrl = 'blob:http://localhost:3000/fake-uuid';

    usePoolStore.setState({
      currentPool: {
        ...store.currentPool,
        maps: [map1],
      },
    });

    const jsonStr = usePoolStore.getState().exportPoolJson();
    expect(jsonStr).toBeDefined();
    expect(typeof jsonStr).toBe('string');

    const parsed = JSON.parse(jsonStr) as Mappool;
    expect(parsed.name).toBe('Torneio Teste 2026');
    expect(parsed.maps.length).toBe(1);
    expect(parsed.maps[0].id).toBe('map1');
    expect(parsed.maps[0].tournamentName).toBe('Torneio A');
    expect(parsed.maps[0].stageName).toBe('Qualifiers');

    // Blobs e URLs de blob temporárias não devem ser exportados no JSON
    expect((parsed.maps[0] as any).audioBlob).toBeUndefined();
    expect(parsed.maps[0].audioUrl).toBeUndefined();
  });

  it('importa JSON válido com sucesso preservando integridade de dados e tags', async () => {
    const map1 = createMockMap('map_gf_1', 'NM1', '6WC 2026', 'Grand Finals', 6.2);
    const map2 = createMockMap('map_q_1', 'HD1', '6WC 2026', 'Qualifiers', 5.4);

    const poolToExport: Mappool = {
      id: 'pool-6wc',
      name: '6WC 2026',
      stage: 'Grand Finals',
      description: 'Mappool completa do 6WC',
      createdAt: 1710000000000,
      updatedAt: 1710000000000,
      maps: [map1, map2],
    };

    const jsonString = JSON.stringify(poolToExport);
    const ok = await usePoolStore.getState().importPoolJson(jsonString);

    expect(ok).toBe(true);
    const state = usePoolStore.getState();
    expect(state.currentPool.maps.length).toBe(2);
    expect(state.currentPool.name).toBe('6WC 2026');
    expect(state.currentPool.maps[0].tournamentName).toBe('6WC 2026');
    expect(state.currentPool.maps[0].stageName).toBe('Grand Finals');
    expect(state.currentPool.maps[1].stageName).toBe('Qualifiers');
  });

  it('rejeita com segurança JSONs corrompidos ou inválidos sem quebrar a aplicação', async () => {
    // 1. String JSON inválida
    const res1 = await usePoolStore.getState().importPoolJson('{ isso nao e um json valido');
    expect(res1).toBe(false);

    // 2. Objeto sem campo maps
    const res2 = await usePoolStore.getState().importPoolJson('{"foo": "bar"}');
    expect(res2).toBe(false);

    // 3. Campo maps não é array
    const res3 = await usePoolStore.getState().importPoolJson('{"maps": 12345}');
    expect(res3).toBe(false);

    // 4. Array com objetos sem id ou metadata
    const res4 = await usePoolStore.getState().importPoolJson('{"maps": [{"foo": 1}, null, 42]}');
    expect(res4).toBe(false);

    // O estado anterior da pool deve permanecer intacto
    expect(Array.isArray(usePoolStore.getState().currentPool.maps)).toBe(true);
  });

  it('saneia mapas incompletos preenchendo campos ausentes com fallbacks seguros', async () => {
    const incompleteMapJson = JSON.stringify({
      id: 'legacy-pool',
      name: 'Legacy Pool',
      maps: [
        {
          id: 'map_partial',
          metadata: { title: 'Partial Song', artist: 'Unknown' },
          // stats, difficulty e skills ausentes intencionalmente
        },
      ],
    });

    const ok = await usePoolStore.getState().importPoolJson(incompleteMapJson);
    expect(ok).toBe(true);

    const imported = usePoolStore.getState().currentPool.maps[0];
    expect(imported).toBeDefined();
    expect(imported.id).toBe('map_partial');
    // Deve ter sido preenchido com fallbacks seguros para evitar render crash
    expect(imported.stats).toBeDefined();
    expect(imported.stats.starRating).toBe(5.0);
    expect(imported.difficulty.cs).toBe(4);
    expect(imported.skills.snapAim).toBe(0);
  });

  it('filtra adequadamente por Torneio e Etapa sem perder o modo "tudo junto misturado"', () => {
    const mapA_qual = createMockMap('1', 'NM1', '6WC 2026', 'Qualifiers', 5.0);
    const mapA_gf = createMockMap('2', 'NM2', '6WC 2026', 'Grand Finals', 6.5);
    const mapB_finals = createMockMap('3', 'HD1', 'OWC 2025', 'Finals', 6.0);

    const allMaps = [mapA_qual, mapA_gf, mapB_finals];

    // 1. "Tudo junto misturado" (default: ALL e ALL)
    const all = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', 'ALL', 'ALL');
    expect(all.length).toBe(3);
    expect(all[0].stats.starRating).toBe(6.5); // 1º lugar decrescente

    // 2. Filtrar apenas por Torneio 6WC 2026
    const only6wc = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', '6WC 2026', 'ALL');
    expect(only6wc.length).toBe(2);
    expect(only6wc.every((m) => m.tournamentName === '6WC 2026')).toBe(true);

    // 3. Filtrar por Etapa Grand Finals
    const onlyGf = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', 'ALL', 'Grand Finals');
    expect(onlyGf.length).toBe(1);
    expect(onlyGf[0].stageName).toBe('Grand Finals');

    // 4. Filtrar por Torneio e Etapa combinados
    const combined = getFilteredAndSortedMaps(allMaps, 'ALL', '', 'sr', 'desc', '6WC 2026', 'Qualifiers');
    expect(combined.length).toBe(1);
    expect(combined[0].id).toBe('1');
  });

  it('guarda setActiveTournamentFilter contra re-renders infinitos quando chamado repetidamente', () => {
    let callCount = 0;
    const unsubscribe = usePoolStore.subscribe(() => {
      callCount++;
    });

    // Chamada inicial para null quando já era null não deve disparar notificação
    usePoolStore.getState().setActiveTournamentFilter(null);
    expect(callCount).toBe(0);

    // Chamada para um filtro
    const filter = {
      stageName: 'Qualifiers',
      entries: [{ slot: 'NM1', songInfo: 'Test', beatmapId: 100, stage: 'Qualifiers' }],
    };
    usePoolStore.getState().setActiveTournamentFilter(filter);
    expect(callCount).toBe(1);

    // Chamada com o mesmo conteúdo não deve disparar novamente
    usePoolStore.getState().setActiveTournamentFilter(filter);
    expect(callCount).toBe(1);

    unsubscribe();
  });
});
