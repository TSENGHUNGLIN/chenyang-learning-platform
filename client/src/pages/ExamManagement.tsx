import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, FileText, Users } from "lucide-react";
import { useLocation } from "wouter";

/**
 * 考試管理入口頁面
 * 提供兩個主要功能的入口：考試列表和考生規劃
 */
export default function ExamManagement() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* 頁首 */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">考試管理</h1>
            <p className="text-sm text-slate-600 mt-1">選擇您要進行的管理功能</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-2"
          >
            <Home className="h-4 w-4" />
            返回首頁
          </Button>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* 考試列表卡片 */}
          <Card
            className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            onClick={() => setLocation("/exams/list")}
          >
            {/* 漸層背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            
            {/* 裝飾圓點 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            {/* 內容 */}
            <div className="relative p-8 flex flex-col items-center text-center space-y-6">
              {/* 圖示 */}
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="h-10 w-10 text-white" />
              </div>

              {/* 標題 */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">考試列表</h2>
                <p className="text-blue-50 text-sm leading-relaxed">
                  查看、編輯、管理所有考卷，指派考試
                </p>
              </div>

              {/* 功能說明 */}
              <div className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left space-y-2">
                <p className="text-white text-sm font-medium mb-2">主要功能：</p>
                <ul className="text-blue-50 text-xs space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>建立新考試、編輯考試內容</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>預覽考卷、管理考試狀態</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>查看考試分析、匯出成績</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>刪除考試、批次操作</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>小規模指派考試</span>
                  </li>
                </ul>
              </div>

              {/* 按鈕 */}
              <Button
                size="lg"
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold shadow-lg group-hover:shadow-xl transition-all"
              >
                進入考試列表
              </Button>
            </div>
          </Card>

          {/* 考生規劃卡片 */}
          <Card
            className="group relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            onClick={() => setLocation("/exam-planning")}
          >
            {/* 漸層背景 */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 opacity-90 group-hover:opacity-100 transition-opacity" />
            
            {/* 裝飾圓點 */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            {/* 內容 */}
            <div className="relative p-8 flex flex-col items-center text-center space-y-6">
              {/* 圖示 */}
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-10 w-10 text-white" />
              </div>

              {/* 標題 */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">考生規劃</h2>
                <p className="text-emerald-50 text-sm leading-relaxed">
                  批次指派考試給考生
                </p>
              </div>

              {/* 功能說明 */}
              <div className="w-full bg-white/10 backdrop-blur-sm rounded-xl p-4 text-left space-y-2">
                <p className="text-white text-sm font-medium mb-2">主要功能：</p>
                <ul className="text-emerald-50 text-xs space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>選擇考生（單選、部門、複選）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>選擇考卷（支援搜尋和篩選）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>設定考試時間（開始、截止）</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-white mt-0.5">•</span>
                    <span>CSV 批次匯入、規劃範本</span>
                  </li>
                </ul>
              </div>

              {/* 按鈕 */}
              <Button
                size="lg"
                className="w-full bg-white text-emerald-600 hover:bg-emerald-50 font-semibold shadow-lg group-hover:shadow-xl transition-all"
              >
                進入考生規劃
              </Button>
            </div>
          </Card>
        </div>

        {/* 底部提示 */}
        <div className="mt-12 text-center">
          <p className="text-slate-600 text-sm">
            💡 提示：點擊卡片即可進入對應的管理功能
          </p>
        </div>
      </div>
    </div>
  );
}

