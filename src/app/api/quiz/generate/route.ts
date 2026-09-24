import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const pin = request.headers.get('x-creator-pin');
    const validPin = process.env.NEXT_PUBLIC_CREATOR_PIN || 'studybud2026';

    if (pin !== validPin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prompt, questionCount } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const count = questionCount || 10;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    const systemInstruction = `Generate exactly ${count} study quiz questions about: ${prompt}

Format each question exactly like this:
Q: [question text]
A: [answer]
H: [hint]

Rules:
- Mix question types: multiple choice (provide options as A), B), C), D) in the question), true/false, fill-in-the-blank (use _____ in the question), and short answer
- For true/false questions, the answer must be exactly "True" or "False"
- For fill-in-the-blank, use _____ in the question text
- Always provide a helpful hint
- Separate each question with a blank line`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemInstruction,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate questions from AI API' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return NextResponse.json({ text });
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
