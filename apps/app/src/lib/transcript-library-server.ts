import fs from 'node:fs';
import { listPublishedVideos } from './livestreams-store';
import type { SnapshotVideo } from './title-lab';
import { readTitleSnapshot } from './title-lab-store';
import type { TranscriptEntry } from './transcript-library';
import { normalizeTranscript } from './transcript-normalize';

/** Transcript files are repo data and never change while the server runs. */
const searchTextCache = new Map<string, string>();

function searchTextFor(transcriptPath: string): string {
  const cached = searchTextCache.get(transcriptPath);
  if (cached !== undefined) return cached;
  const text = normalizeTranscript(
    fs.readFileSync(transcriptPath, 'utf-8'),
  ).plainText.replace(/\s+/g, ' ');
  searchTextCache.set(transcriptPath, text);
  return text;
}

export async function loadTranscriptEntries(): Promise<TranscriptEntry[]> {
  const videos = await listPublishedVideos();
  return videos.map((video) => ({
    ...video,
    searchText: searchTextFor(video.transcriptPath),
  }));
}

/**
 * Videos the channel snapshot knows about. Null when no snapshot is stored or
 * the store cannot be read, so the page can say nothing instead of guessing.
 */
export async function loadChannelSnapshotVideos(): Promise<
  SnapshotVideo[] | null
> {
  try {
    return (await readTitleSnapshot())?.videos ?? null;
  } catch {
    return null;
  }
}
