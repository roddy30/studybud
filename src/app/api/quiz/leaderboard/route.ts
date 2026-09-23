import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { LeaderboardEntry } from '@/types/quiz';

/**
 * POST /api/quiz/leaderboard
 * Submit an authenticated user's score to the leaderboard
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      shareCode,
      score,
      total,
      timeUsedSeconds,
      userId,
      userName,
      userAvatar,
    } = body as {
      shareCode: string;
      score: number;
      total: number;
      timeUsedSeconds: number;
      userId: string;
      userName?: string;
      userAvatar?: string | null;
    };

    if (
      !shareCode ||
      !userId ||
      typeof score !== 'number' ||
      typeof total !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Sign in with Google required to post to the leaderboard.' },
        { status: 400 }
      );
    }

    const cleanUserName = (userName || 'Student').trim();
    const cleanAvatar = userAvatar || null;

    // Check existing score to preserve best attempt
    const { data: existing } = await supabase
      .from('quiz_scores')
      .select('score, total, percentage')
      .eq('share_code', shareCode.toUpperCase())
      .eq('user_id', userId)
      .maybeSingle();

    const currentPercentage = Math.round((score / Math.max(1, total)) * 100);

    // If existing score is higher, retain personal best
    if (existing && existing.percentage >= currentPercentage) {
      return NextResponse.json({
        success: true,
        message: 'Personal best retained',
        isBest: false,
      });
    }

    const { error: upsertError } = await supabase
      .from('quiz_scores')
      .upsert(
        {
          share_code: shareCode.toUpperCase(),
          user_id: userId,
          user_name: cleanUserName,
          user_avatar: cleanAvatar,
          score,
          total,
          time_used_seconds: Math.max(0, Math.floor(timeUsedSeconds || 0)),
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'share_code, user_id' }
      );

    if (upsertError) {
      console.error('Leaderboard score upsert error:', upsertError);
      return NextResponse.json(
        { error: `Failed to record score: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, isBest: true });
  } catch (err: any) {
    console.error('Leaderboard POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quiz/leaderboard?code=XYZ
 * Fetch leaderboard for a given share code
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase().trim();

    if (!code) {
      return NextResponse.json(
        { error: 'Quiz code parameter is required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check quiz title
    const { data: quiz } = await supabase
      .from('shared_quizzes')
      .select('title')
      .eq('share_code', code)
      .maybeSingle();

    const { data: scores, error } = await supabase
      .from('quiz_scores')
      .select(
        'id, user_id, user_name, user_avatar, score, total, percentage, time_used_seconds, completed_at'
      )
      .eq('share_code', code)
      .order('percentage', { ascending: false })
      .order('time_used_seconds', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return NextResponse.json(
        { error: 'Could not load leaderboard data.' },
        { status: 500 }
      );
    }

    const entries: LeaderboardEntry[] = (scores || []).map((s, index) => ({
      rank: index + 1,
      userId: s.user_id,
      userName: s.user_name,
      userAvatar: s.user_avatar,
      score: s.score,
      total: s.total,
      percentage: Math.round(s.percentage || 0),
      timeUsedSeconds: s.time_used_seconds || 0,
      completedAt: s.completed_at,
    }));

    return NextResponse.json({
      success: true,
      quizTitle: quiz?.title || 'Shared Quiz',
      shareCode: code,
      entries,
    });
  } catch (err: any) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
