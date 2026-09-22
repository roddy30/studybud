import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateJoinCode } from '@/lib/utils';
import { ParsedQuestion } from '@/types/quiz';

const CREATOR_PIN = process.env.NEXT_PUBLIC_CREATOR_PIN || 'studybud2026';

/**
 * POST /api/quiz/share
 * Publish a quiz and get a 6-character share code (Restricted to Creator)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sign in with Google required to share quizzes.' },
        { status: 401 }
      );
    }

    // Verify creator authorization (Admin email or PIN header)
    const adminEmail =
      process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const pinHeader = request.headers.get('x-creator-pin');

    const isEmailAdmin =
      adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim();
    const isPinAdmin = pinHeader && pinHeader.trim() === CREATOR_PIN;

    if (adminEmail && !isEmailAdmin && !isPinAdmin) {
      return NextResponse.json(
        {
          error:
            'Quiz creation and publishing is currently locked to the course administrator.',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, questions } = body as {
      title: string;
      questions: ParsedQuestion[];
    };

    if (!title || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Quiz must have a title and at least one question.' },
        { status: 400 }
      );
    }

    // Generate unique share code
    let shareCode = generateJoinCode();
    let attempts = 0;

    // Verify uniqueness
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from('shared_quizzes')
        .select('id')
        .eq('share_code', shareCode)
        .maybeSingle();

      if (!existing) break;
      shareCode = generateJoinCode();
      attempts++;
    }

    const userName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Instructor';

    const { data, error } = await supabase
      .from('shared_quizzes')
      .insert({
        share_code: shareCode,
        title: title.trim(),
        questions,
        created_by: user.id,
        creator_name: userName,
      })
      .select('share_code, id, title')
      .single();

    if (error) {
      console.error('Error inserting shared quiz:', error);
      return NextResponse.json(
        { error: 'Failed to share quiz. Database error.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shareCode: data.share_code,
      id: data.id,
    });
  } catch (err: any) {
    console.error('Share quiz error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/quiz/share?code=XYZ
 * Retrieve a shared quiz by its 6-character code
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase().trim();

    if (!code) {
      return NextResponse.json(
        { error: 'Code parameter is required.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: quiz, error } = await supabase
      .from('shared_quizzes')
      .select('id, share_code, title, questions, creator_name, created_at')
      .eq('share_code', code)
      .maybeSingle();

    if (error || !quiz) {
      return NextResponse.json(
        { error: 'Quiz not found. Please verify the code.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        questions: quiz.questions,
        shareCode: quiz.share_code,
        creatorName: quiz.creator_name,
        createdAt: quiz.created_at,
      },
    });
  } catch (err: any) {
    console.error('Get shared quiz error:', err);
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}
