import { analyzeBeatmap } from '../engine/analyzer';
import { extractOsuModeQuick } from '../engine/parser';
import { BeatmapAnalysisResult, BeatmapOrigin } from '../engine/types';

export interface WorkerAnalyzeFileInput {
  fileName: string;
  text: string;
  bytes?: Uint8Array;
  folderName?: string;
  lightweight?: boolean;
  origin?: BeatmapOrigin;
  localOsuPath?: string;
  localAudioPath?: string;
  localBgPath?: string;
  fileMtimeMs?: number;
  skipNonStandard?: boolean;
}

export interface WorkerAnalyzePayload {
  type: 'ANALYZE_BATCH';
  files: WorkerAnalyzeFileInput[];
}

export type WorkerMessage =
  | { type: 'PROGRESS'; current: number; total: number; currentFileName: string }
  | { type: 'SUCCESS'; results: BeatmapAnalysisResult[]; skippedNonStandard: number }
  | { type: 'ERROR'; message: string };

self.onmessage = async (event: MessageEvent<WorkerAnalyzePayload>) => {
  const { type, files } = event.data;

  if (type === 'ANALYZE_BATCH') {
    try {
      const results: BeatmapAnalysisResult[] = [];
      let skippedNonStandard = 0;
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const file = files[i];

        self.postMessage({
          type: 'PROGRESS',
          current: i + 1,
          total,
          currentFileName: file.fileName,
        } as WorkerMessage);

        if (file.skipNonStandard && extractOsuModeQuick(file.text) !== 0) {
          skippedNonStandard++;
          continue;
        }

        const result = await analyzeBeatmap(
          file.text,
          file.fileName,
          file.bytes,
          undefined,
          undefined,
          {
            folderName: file.folderName,
            lightweight: file.lightweight,
            origin: file.origin,
            localOsuPath: file.localOsuPath,
            localAudioPath: file.localAudioPath,
            localBgPath: file.localBgPath,
            fileMtimeMs: file.fileMtimeMs,
          }
        );

        if (file.skipNonStandard && (result.metadata.mode ?? 0) !== 0) {
          skippedNonStandard++;
          continue;
        }

        results.push(result);
      }

      self.postMessage({
        type: 'SUCCESS',
        results,
        skippedNonStandard,
      } as WorkerMessage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      self.postMessage({
        type: 'ERROR',
        message: msg,
      } as WorkerMessage);
    }
  }
};
