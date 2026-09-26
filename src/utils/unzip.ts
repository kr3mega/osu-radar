import { unzipSync, strFromU8 } from 'fflate';

export interface ExtractedOsuFile {
  fileName: string;
  text: string;
  bytes: Uint8Array;
  audioBlob?: Blob;
}

/**
 * Extracts .osu files and song audio from a .osz or .zip archive directly in memory.
 */
export async function extractOsuFilesFromZip(buffer: ArrayBuffer): Promise<ExtractedOsuFile[]> {
  const uint8 = new Uint8Array(buffer);
  const extracted: ExtractedOsuFile[] = [];

  // Filter .osu files and common song audio files (.mp3, .ogg, .wav)
  const unzipped = unzipSync(uint8, {
    filter: (file) => {
      const lower = file.name.toLowerCase();
      return (
        lower.endsWith('.osu') ||
        lower.endsWith('.mp3') ||
        lower.endsWith('.ogg') ||
        lower.endsWith('.wav')
      );
    },
  });

  // Find song audio blob if present in the package
  let audioBlob: Blob | undefined;
  for (const [filePath, fileData] of Object.entries(unzipped)) {
    const lower = filePath.toLowerCase();
    if (lower.endsWith('.mp3') || lower.endsWith('.ogg') || lower.endsWith('.wav')) {
      const mime = lower.endsWith('.ogg')
        ? 'audio/ogg'
        : lower.endsWith('.wav')
        ? 'audio/wav'
        : 'audio/mpeg';
      audioBlob = new Blob([fileData], { type: mime });
      break;
    }
  }

  for (const [filePath, fileData] of Object.entries(unzipped)) {
    if (filePath.toLowerCase().endsWith('.osu')) {
      const fileName = filePath.split('/').pop() || filePath;
      const text = strFromU8(fileData);
      extracted.push({
        fileName,
        text,
        bytes: fileData,
        audioBlob,
      });
    }
  }

  return extracted;
}
