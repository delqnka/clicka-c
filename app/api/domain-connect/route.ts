import { NextRequest, NextResponse } from 'next/server';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error: 'Domain connect не е имплементиран в този MVP build.',
      hint: 'Тук се интегрира Vercel Domains API + валидация на ownership + запис в salons.custom_domain.',
    },
    { status: 501 }
  );
}

