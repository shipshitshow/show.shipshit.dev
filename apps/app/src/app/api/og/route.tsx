import { NextResponse } from 'next/server';
import { DEFAULT_SOCIAL_IMAGE_PATH } from '@/lib/site';

export function GET(request: Request) {
  return NextResponse.redirect(new URL(DEFAULT_SOCIAL_IMAGE_PATH, request.url));
}
