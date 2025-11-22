import { getExamAnalytics } from './server/examAnalytics.ts';

async function testAnalytics() {
  try {
    console.log('Testing getExamAnalytics for examId 210006...');
    const result = await getExamAnalytics(210006);
    console.log('Success! Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAnalytics();
