'use client';

import { useState } from 'react';
import { ParsedQuestion, QuestionType } from '@/types/quiz';
import { X, Save, Plus } from 'lucide-react';

interface QuestionPreviewProps {
  questions: ParsedQuestion[];
  onUpdateQuestions: (updated: ParsedQuestion[]) => void;
  onClose: () => void;
}

export function QuestionPreview({ questions, onUpdateQuestions, onClose }: QuestionPreviewProps) {
  const [editedQuestions, setEditedQuestions] = useState<ParsedQuestion[]>([...questions]);

  const handleUpdateField = (index: number, field: keyof ParsedQuestion, value: any) => {
    const updated = [...editedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setEditedQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...editedQuestions];
    const opts = [...(updated[qIndex].options || [])];
    opts[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: opts };
    setEditedQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = [...editedQuestions];
    updated.splice(index, 1);
    setEditedQuestions(updated);
  };

  const handleSave = () => {
    onUpdateQuestions(editedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl flex flex-col max-h-[90vh] shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">
            Preview & Edit Questions ({editedQuestions.length})
          </h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {editedQuestions.map((q, qIndex) => (
            <div key={q.id || qIndex} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-zinc-700 text-zinc-300 text-xs font-medium px-2 py-0.5 rounded-full">
                    Q{qIndex + 1}
                  </span>
                  <span className="bg-zinc-700/50 text-zinc-400 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
                    {q.type.replace('_', ' ')}
                  </span>
                </div>
                <button 
                  onClick={() => handleRemoveQuestion(qIndex)}
                  className="text-zinc-500 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Question</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => handleUpdateField(qIndex, 'question', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                
                {q.type === 'multiple_choice' && q.options && (
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Options</label>
                    <div className="space-y-2">
                      {q.options.map((opt, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 font-mono w-4">{String.fromCharCode(65 + oIndex)}</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(qIndex, oIndex, e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Answer</label>
                  <input
                    type="text"
                    value={q.answer}
                    onChange={(e) => handleUpdateField(qIndex, 'answer', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Hint</label>
                  <input
                    type="text"
                    value={q.hint}
                    onChange={(e) => handleUpdateField(qIndex, 'hint', e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          ))}
          {editedQuestions.length === 0 && (
            <div className="text-center py-8 text-zinc-500">
              No questions remaining.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
