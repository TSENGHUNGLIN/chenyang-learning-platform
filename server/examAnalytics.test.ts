import { describe, it, expect } from 'vitest';
import { getExamAnalytics } from './examAnalytics';

describe('examAnalytics', () => {
  it('should return analytics for exam 210006', async () => {
    try {
      const result = await getExamAnalytics(210006);
      console.log('Analytics result:', JSON.stringify(result, null, 2));
      
      expect(result).toBeDefined();
      expect(result.exam).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.scoreDistribution).toBeDefined();
      expect(result.answerTimeStats).toBeDefined();
      expect(result.wrongAnswers).toBeDefined();
      expect(result.studentScores).toBeDefined();
    } catch (error) {
      console.error('Error in getExamAnalytics:', error);
      throw error;
    }
  });
});

