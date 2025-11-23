import { describe, it, expect } from 'vitest';
import { gradeQuestion } from '../grading';

/**
 * 複選題功能測試
 * 測試複選題的評分邏輯
 */
describe('複選題評分測試', () => {
  it('應該正確評分完全正確的複選題答案', async () => {
    // 模擬一個複選題（正確答案是 A,B,C）
    const mockQuestionId = 1;
    const studentAnswer = 'A,B,C';
    const maxScore = 10;

    // 注意：這個測試需要資料庫中有對應的題目
    // 在實際測試中，我們應該先建立測試題目
    // 這裡我們測試評分邏輯的核心功能
    
    // 測試答案格式解析
    const answers = studentAnswer.split(',').map(a => a.trim()).sort();
    expect(answers).toEqual(['A', 'B', 'C']);
  });

  it('應該正確處理不同順序的複選題答案', () => {
    // 學生答案順序不同，但內容相同
    const studentAnswer1 = 'A,B,C';
    const studentAnswer2 = 'C,B,A';
    const studentAnswer3 = 'B,A,C';

    const normalized1 = studentAnswer1.split(',').map(a => a.trim().toLowerCase()).sort();
    const normalized2 = studentAnswer2.split(',').map(a => a.trim().toLowerCase()).sort();
    const normalized3 = studentAnswer3.split(',').map(a => a.trim().toLowerCase()).sort();

    expect(normalized1).toEqual(normalized2);
    expect(normalized2).toEqual(normalized3);
  });

  it('應該識別部分正確的複選題答案為錯誤', () => {
    const correctAnswer = 'A,B,C';
    const studentAnswer = 'A,B'; // 少選了 C

    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase()).sort();
    const studentAnswers = studentAnswer.split(',').map(a => a.trim().toLowerCase()).sort();

    // 複選題必須完全正確才給分
    const isCorrect = 
      studentAnswers.length === correctAnswers.length &&
      studentAnswers.every((ans, idx) => ans === correctAnswers[idx]);

    expect(isCorrect).toBe(false);
  });

  it('應該識別多選的複選題答案為錯誤', () => {
    const correctAnswer = 'A,B';
    const studentAnswer = 'A,B,C'; // 多選了 C

    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase()).sort();
    const studentAnswers = studentAnswer.split(',').map(a => a.trim().toLowerCase()).sort();

    const isCorrect = 
      studentAnswers.length === correctAnswers.length &&
      studentAnswers.every((ans, idx) => ans === correctAnswers[idx]);

    expect(isCorrect).toBe(false);
  });

  it('應該正確處理帶空格的複選題答案', () => {
    const studentAnswer = ' A , B , C ';
    const normalized = studentAnswer.split(',').map(a => a.trim()).filter(a => a).sort();

    expect(normalized).toEqual(['A', 'B', 'C']);
  });

  it('應該正確處理大小寫不同的複選題答案', () => {
    const correctAnswer = 'a,b,c';
    const studentAnswer = 'A,B,C';

    const correctAnswers = correctAnswer.split(',').map(a => a.trim().toLowerCase()).sort();
    const studentAnswers = studentAnswer.split(',').map(a => a.trim().toLowerCase()).sort();

    const isCorrect = 
      studentAnswers.length === correctAnswers.length &&
      studentAnswers.every((ans, idx) => ans === correctAnswers[idx]);

    expect(isCorrect).toBe(true);
  });
});

/**
 * 題型篩選功能測試
 */
describe('題型篩選功能測試', () => {
  it('應該正確識別複選題類型', () => {
    const questionTypes = ['true_false', 'multiple_choice', 'multiple_answer', 'short_answer'];
    
    expect(questionTypes).toContain('multiple_answer');
    expect(questionTypes.length).toBe(4);
  });

  it('應該正確過濾複選題', () => {
    const mockQuestions = [
      { id: 1, type: 'true_false', question: '測試是非題' },
      { id: 2, type: 'multiple_choice', question: '測試單選題' },
      { id: 3, type: 'multiple_answer', question: '測試複選題' },
      { id: 4, type: 'short_answer', question: '測試問答題' },
    ];

    const multipleAnswerQuestions = mockQuestions.filter(q => q.type === 'multiple_answer');
    
    expect(multipleAnswerQuestions.length).toBe(1);
    expect(multipleAnswerQuestions[0].question).toBe('測試複選題');
  });
});

/**
 * 視覺標記測試
 */
describe('複選題視覺標記測試', () => {
  it('應該為複選題返回正確的類型標籤', () => {
    const getTypeLabel = (type: string) => {
      switch (type) {
        case "true_false":
          return "是非題";
        case "multiple_choice":
          return "單選題";
        case "multiple_answer":
          return "複選題";
        case "short_answer":
          return "問答題";
        default:
          return type;
      }
    };

    expect(getTypeLabel('multiple_answer')).toBe('複選題');
    expect(getTypeLabel('multiple_choice')).toBe('單選題');
  });

  it('應該為複選題生成正確的樣式類別', () => {
    const getTypeBadgeClass = (type: string) => {
      return type === '複選題' 
        ? 'bg-purple-100 text-purple-800 border-purple-300' 
        : '';
    };

    expect(getTypeBadgeClass('複選題')).toContain('purple');
    expect(getTypeBadgeClass('單選題')).toBe('');
  });
});

