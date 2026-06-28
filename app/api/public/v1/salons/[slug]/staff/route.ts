import { NextRequest, NextResponse } from 'next/server';
import { GET as getStaff } from '@/app/api/public/salons/[slug]/staff/route';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  return getStaff(request, { params });
}
