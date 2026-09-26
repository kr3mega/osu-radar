import { analyzeBeatmap } from '../engine/analyzer';
import { BeatmapAnalysisResult } from '../engine/types';

export interface WorkerAnalyzePayload {
  type: 'ANALYZE_BATCH';
  files: Array<{
    fileName: string;
    text: string;
    bytes?: Uint8Array;
  }>;
}

export type WorkerMessage =
  | { type: 'PROGRESS'; current: number; total: number; currentFileName: string }
  | { type: 'SUCCESS'; results: BeatmapAnalysisResult[] }
  | { type: 'ERROR'; message: string };

self.onmessage = async (event: MessageEvent<WorkerAnalyzePayload>) => {
  const { type, files } = event.data;

  if (type === 'ANALYZE_BATCH') {
    try {
      const results: BeatmapAnalysisResult[] = [];
      const total = files.length;

      for (let i = 0; i < total; i++) {
        const file = files[i];

        self.postMessage({
          type: 'PROGRESS',
          current: i + 1,
          total,
          currentFileName: file.fileName,
        } as WorkerMessage);

        const result = await analyzeBeatmap(file.text, file.fileName, file.bytes);
        results.push(result);
      }

      self.postMessage({
        type: 'SUCCESS',
        results,
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
