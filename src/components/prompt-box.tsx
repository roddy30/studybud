'use client';

import { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

const GEMINI_PROMPT_TEMPLATE = `Create a study quiz about [ENTER YOUR TOPIC / PASTE NOTES HERE].
Format each question strictly like this:

Q: [Question here]
A: [Concise answer here]
H: [One short hint that guides without spoiling the answer]

Rules:
1. Generate 10-20 questions covering key definitions, mechanics, and facts.
2. Mix formats: standard questions, True/False (answer starting with True or False), and Fill-in-the-blank (use _____ for the blank).
3. Do not add numbering or bullet points. Just Q:, A:, and H: on their own lines.`;

export function PromptBox() {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(GEMINI_PROMPT_TEMPLATE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-4 transition-all">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white"
        >
          <Sparkles className="w-4 h-4 text-blue-500" />
          <span>Gemini Prompt Template</span>
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
          )}
        </button>

        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
              <span>Copy Template</span>
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            Paste this prompt into Gemini with your lecture notes, textbook excerpt, or topic:
          </p>
          <pre className="text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 overflow-x-auto text-zinc-800 dark:text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap select-all">
            {GEMINI_PROMPT_TEMPLATE}
          </pre>
        </div>
      )}
    </div>
  );
}
