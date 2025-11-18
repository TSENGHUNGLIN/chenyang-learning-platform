import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ai_analysis_prompt_history';
const MAX_HISTORY = 10;

export interface PromptHistoryItem {
  id: string;
  prompt: string;
  timestamp: number;
  analysisType: string;
}

export function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  // 從localStorage載入歷史記錄
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error('Failed to load prompt history:', error);
    }
  }, []);

  // 儲存歷史記錄到localStorage
  const saveToStorage = (items: PromptHistoryItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      setHistory(items);
    } catch (error) {
      console.error('Failed to save prompt history:', error);
    }
  };

  // 新增提示詞到歷史記錄
  const addPrompt = (prompt: string, analysisType: string) => {
    if (!prompt.trim()) return;

    const newItem: PromptHistoryItem = {
      id: Date.now().toString(),
      prompt: prompt.trim(),
      timestamp: Date.now(),
      analysisType,
    };

    // 移除重複的提示詞
    const filtered = history.filter(item => item.prompt !== newItem.prompt);
    
    // 新增到最前面，並限制數量
    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY);
    saveToStorage(updated);
  };

  // 刪除單筆歷史記錄
  const removePrompt = (id: string) => {
    const updated = history.filter(item => item.id !== id);
    saveToStorage(updated);
  };

  // 清除全部歷史記錄
  const clearAll = () => {
    saveToStorage([]);
  };

  // 格式化相對時間
  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '剛才';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    if (days < 7) return `${days}天前`;
    
    return new Date(timestamp).toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
    });
  };

  return {
    history,
    addPrompt,
    removePrompt,
    clearAll,
    getRelativeTime,
  };
}

