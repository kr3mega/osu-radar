import { unzipSync, strFromU8 } from 'fflate';

export interface ExtractedOsuFile {
  fileName: string;
  text: string;
  bytes: Uint8Array;
}

/**
 * Extracts .osu files from a .osz or .zip archive directly in memory.
 * Ignores all media files (.mp3, .wav, .png, .jpg, .mp4) to minimize RAM usage (< 5MB).
 */
export async function extractOsuFilesFromZip(buffer: ArrayBuffer): Promise<ExtractedOsuFile[]> {
  const uint8 = new Uint8Array(buffer);
  const extracted: ExtractedOsuFile[] = [];

  // Filter only .osu files
  const unzipped = unzipSync(uint8, {
    filter: (file) => file.name.toLowerCase().endsWith('.osu'),
  });

  for (const [filePath, fileData] of Object.entries(unzipped)) {
    if (filePath.toLowerCase().endsWith('.osu')) {
      const fileName = filePath.split('/').pop() || filePath;
      const text = strFromU8(fileData);
      extracted.push({
        fileName,
        text,
        bytes: fileData,
      });
    }
  }

  return extracted;
}
