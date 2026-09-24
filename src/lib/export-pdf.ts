import { QuizSet, QuestionResult, QuizAttempt } from '@/types/quiz';

export function exportQuizAsPDF(quiz: QuizSet, includeAnswers: boolean): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${quiz.title} - Print</title>
        <style>
          body {
            font-family: Georgia, serif;
            color: #000;
            line-height: 1.5;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            font-size: 24px;
            margin-bottom: 0.5rem;
          }
          .meta {
            text-align: center;
            font-size: 14px;
            color: #555;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #ccc;
          }
          .question-block {
            margin-bottom: 2rem;
            break-inside: avoid;
          }
          .question-text {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          .options {
            margin-left: 1rem;
            margin-bottom: 0.5rem;
          }
          .option {
            margin-bottom: 0.25rem;
          }
          .answer-line {
            margin-top: 1rem;
            border-bottom: 1px solid #000;
            width: 100%;
            display: inline-block;
          }
          .answer-text {
            margin-top: 0.5rem;
            font-style: italic;
            color: #333;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${quiz.title}</h1>
        <div class="meta">
          Date: ${new Date(quiz.createdAt).toLocaleDateString()} | Total Questions: ${quiz.questions.length}
        </div>
        
        <div class="questions">
          ${quiz.questions.map((q, index) => {
            let optionsHtml = '';
            if (q.type === 'multiple_choice' && q.options) {
              const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
              optionsHtml = '<div class="options">' + q.options.map((opt, i) => 
                `<div class="option">${labels[i] || '•'}) ${opt}</div>`
              ).join('') + '</div>';
            } else if (q.type === 'true_false') {
              optionsHtml = '<div class="options"><div class="option">True / False</div></div>';
            }

            let answerHtml = '';
            if (includeAnswers) {
              answerHtml = `<div class="answer-text">Answer: ${q.answer}</div>`;
            } else {
              if (q.type === 'fill_blank' || q.type === 'type_answer' || q.type === 'flashcard') {
                answerHtml = '<div class="answer-line"></div><div class="answer-line"></div>';
              }
            }

            return `
              <div class="question-block">
                <div class="question-text">${index + 1}. ${q.question}</div>
                ${optionsHtml}
                ${answerHtml}
              </div>
            `;
          }).join('')}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

export function exportResultsAsPDF(attempt: QuizAttempt): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${attempt.title} - Results</title>
        <style>
          body {
            font-family: Georgia, serif;
            color: #000;
            line-height: 1.5;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            text-align: center;
            font-size: 24px;
            margin-bottom: 0.5rem;
          }
          .meta {
            text-align: center;
            font-size: 14px;
            color: #555;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #ccc;
          }
          .question-block {
            margin-bottom: 2rem;
            break-inside: avoid;
            padding-bottom: 1rem;
            border-bottom: 1px dashed #eee;
          }
          .question-text {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          .answer-row {
            margin-bottom: 0.25rem;
          }
          .status {
            font-weight: bold;
            margin-top: 0.5rem;
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
          }
          .status.correct { color: green; border: 1px solid green; }
          .status.wrong { color: red; border: 1px solid red; }
          .status.unanswered { color: gray; border: 1px solid gray; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${attempt.title} - Results</h1>
        <div class="meta">
          Score: ${attempt.score} / ${attempt.total} | Date: ${new Date(attempt.completedAt).toLocaleDateString()}
        </div>
        
        <div class="questions">
          ${attempt.results.map((q, index) => {
            return `
              <div class="question-block">
                <div class="question-text">${index + 1}. ${q.question}</div>
                <div class="answer-row"><strong>Your Answer:</strong> ${q.userAnswer || '<em>No answer</em>'}</div>
                <div class="answer-row"><strong>Correct Answer:</strong> ${q.correctAnswer}</div>
                <div class="status ${q.status}">${q.status.toUpperCase()}</div>
              </div>
            `;
          }).join('')}
        </div>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}
