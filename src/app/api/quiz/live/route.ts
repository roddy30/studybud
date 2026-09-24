import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { shareCode, creatorId } = await req.json();

    if (!shareCode) {
      return NextResponse.json({ error: 'Missing shareCode' }, { status: 400 });
    }

    // Generate random 8-char session code
    const sessionCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const supabase = await createClient();
    const { error } = await supabase
      .from('live_sessions')
      .insert({
        share_code: shareCode,
        session_code: sessionCode,
        status: 'waiting',
        created_by: creatorId || null
      });

    if (error) {
      console.error('Failed to create live session:', error);
      return NextResponse.json({ error: 'Failed to create live session' }, { status: 500 });
    }

    return NextResponse.json({ sessionCode });
  } catch (err) {
    console.error('Error creating live session:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionCode = searchParams.get('sessionCode');

    if (!sessionCode) {
      return NextResponse.json({ error: 'Missing sessionCode' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('session_code', sessionCode)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const { data: participants, error: participantsError } = await supabase
      .from('live_participants')
      .select('*')
      .eq('session_code', sessionCode)
      .order('score', { ascending: false });

    return NextResponse.json({
      session,
      participants: participants || []
    });
  } catch (err) {
    console.error('Error fetching live session:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { sessionCode, action } = await req.json();

    if (!sessionCode || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const updates: any = {};
    if (action === 'start') {
      updates.status = 'active';
      updates.started_at = new Date().toISOString();
    } else if (action === 'finish') {
      updates.status = 'finished';
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('live_sessions')
      .update(updates)
      .eq('session_code', sessionCode);

    if (error) {
      console.error('Failed to update session:', error);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating live session:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
