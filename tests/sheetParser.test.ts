import { describe, it, expect } from 'vitest';
import { parseGoogleSheetUrl, parseMappoolCsv, extractQuickOsuMeta } from '../src/utils/sheetParser';

describe('Google Sheets Mappool Parser & Filtering', () => {
  it('correctly parses Google Sheets URLs to extract spreadsheetId and gid', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1-TX1ykmECyrxFKbNDCI9Z60-hSZ0shG99hxuVnvay2k/edit?gid=217539883#gid=217539883';
    const parsed = parseGoogleSheetUrl(url);

    expect(parsed).not.toBeNull();
    expect(parsed?.spreadsheetId).toBe('1-TX1ykmECyrxFKbNDCI9Z60-hSZ0shG99hxuVnvay2k');
    expect(parsed?.gid).toBe('217539883');
  });

  it('handles default gid when not present in url', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1-TX1ykmECyrxFKbNDCI9Z60-hSZ0shG99hxuVnvay2k/edit';
    const parsed = parseGoogleSheetUrl(url);

    expect(parsed).not.toBeNull();
    expect(parsed?.spreadsheetId).toBe('1-TX1ykmECyrxFKbNDCI9Z60-hSZ0shG99hxuVnvay2k');
    expect(parsed?.gid).toBe('0');
  });

  it('parses CSV structure into tournament stages and slots', () => {
    const sampleCsv = `
,,GRAND FINALS,,,,,,BO13, 2 BANS,,,,,,
,BANNER,PICK,ARTIST - TITLE [DIFF],,SR,BPM,DRAIN,COMBO,CS,AR,OD,MAP ID,MAP ID,MULTIPLIER
,,NM1,Hana - Sakura no Uta -2023Mix- [The World Resonated],Custom,6.03,180,03:49,"1,331x",4,9.3,9,5894468
,,NM2,ArXe - Weeping Crown [Royal],ORIGINAL,6.07,120,01:52,"1,019x",4,9.4,8.5,5894080
,,HD1,Gizel Jimenez - Sextet Montage [Superbia],Custom,6.28,152,03:29,"1,473x",4,9.3,9,5894018
,,TB,TEARS OF TRAGEDY - Void Act [Luna],Custom,5.71,222,05:31,"2,196x",3.5,9.4,9,5853249

,,QUALIFIERS,,,,,,MAPPACK,,,,,,
,BANNER,PICK,ARTIST - TITLE [DIFF],,SR,BPM,DRAIN,COMBO,CS,AR,OD,MAP ID,MAP ID,MULTIPLIER
,,NM1,MISATO - Necro Fantasia [Sotarks' Lunatic],,5.34,175,02:16,781x,3.7,9.2,8.7,1330055
,,HD1,Yves - Soap [Girl],Custom,5.03,135,02:19,693x,4.1,9.2,8,5801414
`;

    const stages = parseMappoolCsv(sampleCsv);
    expect(stages.length).toBe(2);

    const gf = stages[0];
    expect(gf.stageName).toBe('Grand Finals');
    expect(gf.entries.length).toBe(4);
    expect(gf.entries[0].slot).toBe('NM1');
    expect(gf.entries[0].beatmapId).toBe(5894468);
    expect(gf.entries[3].slot).toBe('TB');
    expect(gf.entries[3].beatmapId).toBe(5853249);

    const qual = stages[1];
    expect(qual.stageName).toBe('Qualifiers');
    expect(qual.entries.length).toBe(2);
    expect(qual.entries[0].slot).toBe('NM1');
    expect(qual.entries[0].beatmapId).toBe(1330055);
  });

  it('extracts quick metadata from .osu header without parsing full hitobjects', () => {
    const osuSnippet = `osu file format v14
[General]
AudioFilename: audio.mp3
Mode: 0
[Metadata]
Title:Sakura no Uta
Artist:Hana
Creator:Mappers
Version:The World Resonated
BeatmapID:5894468
BeatmapSetID:123456
[Difficulty]
HPDrainRate:6
[HitObjects]
100,100,1000,1,0
`;

    const meta = extractQuickOsuMeta(osuSnippet);
    expect(meta.beatmapId).toBe(5894468);
    expect(meta.beatmapSetId).toBe(123456);
    expect(meta.title).toBe('Sakura no Uta');
    expect(meta.artist).toBe('Hana');
    expect(meta.version).toBe('The World Resonated');
  });

  it('distinguishes GRAND FINALS, FINALS, SEMIFINALS, QUARTERFINALS without duplicating Finals 3 times', () => {
    const fullTournamentCsv = `
,,GRAND FINALS,,,,,,BO13,,,,,,
,,NM1,Artist A - Song A [Diff],Custom,6.10,180,03:20,1200x,4,9.3,9,100001
,,FINALS,,,,,,BO13,,,,,,
,,NM1,Artist B - Song B [Diff],Custom,5.90,175,03:10,1100x,4,9.2,8.8,100002
,,SEMIFINALS,,,,,,BO11,,,,,,
,,NM1,Artist C - Song C [Diff],Custom,5.70,170,03:00,1000x,4,9.1,8.5,100003
,,QUARTERFINALS,,,,,,BO11,,,,,,
,,NM1,Artist D - Song D [Diff],Custom,5.50,165,02:50,900x,4,9.0,8.2,100004
,,ROUND OF 16,,,,,,BO9,,,,,,
,,NM1,Artist E - Song E [Diff],Custom,5.30,160,02:40,850x,4,8.8,8.0,100005
,,GROUP STAGE,,,,,,BO9,,,,,,
,,NM1,Artist F - Song F [Diff],Custom,5.10,155,02:30,800x,4,8.5,7.8,100006
,,QUALIFIERS,,,,,,MAPPACK,,,,,,
,,NM1,Artist G - Song G [Diff],Custom,4.90,150,02:20,750x,4,8.3,7.5,100007
`;

    const stages = parseMappoolCsv(fullTournamentCsv);
    const stageNames = stages.map((s) => s.stageName);

    expect(stageNames).toEqual([
      'Grand Finals',
      'Finals',
      'Semifinals',
      'Quarterfinals',
      'Round Of 16',
      'Group Stage',
      'Qualifiers',
    ]);

    // Ensure "Finals" appears exactly once and all stage names are unique
    const finalsCount = stageNames.filter((n) => n === 'Finals').length;
    expect(finalsCount).toBe(1);
    expect(new Set(stageNames).size).toBe(stageNames.length);
  });

  it('does not split or duplicate stages when song titles contain stage keywords or when headers repeat', () => {
    const trickyCsv = `
,,FINALS,,,,,,BO13,,,,,,
,,NM1,Camellia - Final Boss [Grand Finals],Custom,6.20,200,04:00,1500x,4,9.5,9.0,200001
,,NM2,Xi - Halcyon [Qualifiers Showcase],Custom,6.05,191,03:45,1400x,4,9.3,8.8,200002
,,FINALS,,,,,,CONTINUED,,,,,,
,,HD1,Mili - String Theocracy [Playoffs],Custom,5.85,140,03:10,1100x,4,9.2,8.5,200003
`;

    const stages = parseMappoolCsv(trickyCsv);
    expect(stages.length).toBe(1);
    expect(stages[0].stageName).toBe('Finals');
    expect(stages[0].entries.length).toBe(3);
  });
});
