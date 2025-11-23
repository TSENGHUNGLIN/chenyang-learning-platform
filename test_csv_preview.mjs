import fetch from 'node-fetch';

// 測試 CSV 預覽 API
const testCSVPreview = async () => {
  try {
    // 使用截圖中的檔案 URL
    const fileUrl = 'https://storage.manus.im/manus-webdev/chenyang-learning-platform/files/寶寶_彰化晨陽_第20週_113月月考_以執行力為食公司目標_建議題庫問問.csv';
    
    console.log('測試 CSV 預覽 API...');
    console.log('檔案 URL:', fileUrl);
    
    // 直接測試從 S3 下載檔案
    const response = await fetch(fileUrl);
    console.log('S3 回應狀態:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    if (!response.ok) {
      console.error('無法下載檔案:', response.statusText);
      return;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('檔案大小:', buffer.length, 'bytes');
    console.log('檔案前 100 個字元:', buffer.toString('utf-8', 0, 100));
    
  } catch (error) {
    console.error('測試失敗:', error);
  }
};

testCSVPreview();
