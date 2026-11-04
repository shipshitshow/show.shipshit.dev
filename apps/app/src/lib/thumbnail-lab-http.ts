import { NextResponse } from 'next/server';
import { logError } from './logger';
import { StorageWriteError } from './producer-storage';
import { ThumbnailConflict } from './thumbnail-lab';
export function thumbnailError(error: unknown) {
  if (error instanceof ThumbnailConflict)
    return NextResponse.json({ error: error.message }, { status: 409 });
  if (error instanceof StorageWriteError) {
    logError('thumbnail_lab.storage_failed', error);
    return NextResponse.json(
      {
        error:
          'The thumbnail could not be saved. Try again; no approval was changed.',
      },
      { status: 503 },
    );
  }
  logError('thumbnail_lab.request_failed', error);
  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : 'The thumbnail lab request failed.',
    },
    { status: 400 },
  );
}
export const thumbnailHeaders = { 'Cache-Control': 'private, no-store' };
