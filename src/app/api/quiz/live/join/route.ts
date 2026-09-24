import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const { sessionCode, userId, userName, userAvatar } = await req.json();

    if (!sessionCode || !userId || !userName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = await createClient();
    // Upsert participant to handle rejoins gracefully
    const { error } = await supabase
      .from('live_participants')
      .upsert({
        session_code: sessionCode,
        user_id: userId,
        user_name: userName,
        user_avatar: userAvatar || null,
      }, {
        onConflict: 'session_code,user_id'
      });

    if (error) {
      console.error('Failed to join session:', error);
      return NextResponse.json({ error: 'Failed to join session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error joining live session:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { sessionCode, userId, score, total, finished } = await req.json();

    if (!sessionCode || !userId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('live_participants')
      .update({
        score,
        total,
        finished
      })
      .eq('session_code', sessionCode)
      .eq('user_id', userId);

    if (error) {
      console.error('Failed to update participant:', error);
      return NextResponse.json({ error: 'Failed to update participant' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating live participant:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
