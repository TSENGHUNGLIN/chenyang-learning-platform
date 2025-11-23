import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import { getPageConfig } from "@/config/pageConfig";
import { Calendar, FileText, Users, TrendingUp, BookOpen, Settings, ClipboardList, Activity, Award, BarChart3, Upload, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";

export default function Home() {
  const { user } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: "評核日曆",
      description: "查看所有考試的截止日期，以日曆形式呈現",
      link: "/calendar",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: TrendingUp,
      title: "AI 分析出題",
      description: "使用 AI 分析考核問答內容，提供深入見解",
      link: "/ai-analysis",
      color: "from-orange-500 to-red-500",
    },
    {
      icon: FileText,
      title: "檔案管理",
      description: "管理所有上傳的考核問答檔案，支援搜尋與篩選（支援 DOCX、CSV 格式）",
      link: "/files",
      color: "from-purple-500 to-pink-500",
    },
    ...(user?.role === "editor" || user?.role === "admin"
      ? [
          {
            icon: BookOpen,
            title: "題庫管理",
            description: "管理考核題庫，支援是非題、選擇題、問答題",
            link: "/question-bank",
            color: "from-indigo-500 to-purple-500",
          },
          {
            icon: ClipboardList,
            title: "考試管理",
            description: "建立、編輯和管理線上考試，支援批次指派考生",
            link: "/exams",
            color: "from-teal-500 to-cyan-500",
          },
        ]
      : []),
    ...(user?.role === "admin"
      ? [
          {
            icon: Settings,
            title: "部門人員",
            description: "管理部門與人員資料",
            link: "/manage",
            color: "from-green-500 to-emerald-500",
          },
        ]
      : []),
  ];

  const { data: stats } = trpc.dashboard.stats.useQuery();
  const { data: recentActivities } = trpc.dashboard.recentActivities.useQuery();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'file_upload':
        return Upload;
      case 'exam_created':
        return ClipboardList;
      case 'exam_submitted':
        return CheckCircle;
      default:
        return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'file_upload':
        return 'text-blue-500';
      case 'exam_created':
        return 'text-green-500';
      case 'exam_submitted':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  const pageConfig = getPageConfig("/");

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* 頁面標題區塊 - 蘋果風格 + 晨陽 LOGO */}
        <div className="flex items-center gap-6">
          {/* 晨陽 LOGO */}
          <div className="flex-shrink-0">
            <img 
              src="/chenyang-logo.jpeg" 
              alt="晨陽 LOGO" 
              className="h-24 w-24 object-contain rounded-lg shadow-md"
            />
          </div>
          
          {/* 歡迎訊息 */}
          {pageConfig && (
            <div className="flex-1">
              <PageHeader
                title={`歡迎回來，${user?.name || "使用者"}`}
                description="晨陽學習成長評核分析"
                icon={pageConfig.icon}
                color={pageConfig.color}
                bgGradient={pageConfig.bgGradient}
                breadcrumbs={pageConfig.breadcrumbs}
              />
            </div>
          )}
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">總題數</CardTitle>
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats?.totalQuestions || 0}</div>
              <p className="text-xs text-blue-700 dark:text-blue-300">題庫中的題目總數</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">總考試數</CardTitle>
              <ClipboardList className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats?.totalExams || 0}</div>
              <p className="text-xs text-green-700 dark:text-green-300">已建立的考試總數</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">平均分數</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats?.averageScore || 0}</div>
              <p className="text-xs text-purple-700 dark:text-purple-300">所有考試的平均分數</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">總考生數</CardTitle>
              <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats?.totalExaminees || 0}</div>
              <p className="text-xs text-orange-700 dark:text-orange-300">系統中的考生總數</p>
            </CardContent>
          </Card>
        </div>

        {/* 功能卡片區 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.title} href={feature.link}>
                <Card className="hover:shadow-lg transition-all cursor-pointer h-full group">
                  <CardHeader>
                    <div
                      className={`h-12 w-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* 最新活動報告 - 移至最下方，只對管理員和編輯者顯示 */}
        {(user?.role === "admin" || user?.role === "editor") && (
          <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-indigo-200 dark:border-indigo-800">
            <CardHeader>
              <CardTitle className="text-indigo-900 dark:text-indigo-100">最新活動報告</CardTitle>
              <CardDescription className="text-indigo-700 dark:text-indigo-300">系統中的最新動態與時間記錄</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities && recentActivities.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
                  {recentActivities.slice(0, 10).map((activity, index) => {
                    const Icon = getActivityIcon(activity.type);
                    const colorClass = getActivityColor(activity.type);
                    return (
                      <div key={index} className="flex items-start gap-4 p-3 rounded-lg bg-white/50 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-900 transition-colors">
                        <div className={`mt-1 ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">{activity.title}</p>
                          <p className="text-sm text-indigo-700 dark:text-indigo-300">{activity.description}</p>
                          <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
                            <span className="font-medium">
                              {format(new Date(activity.timestamp), "yyyy-MM-dd HH:mm:ss", { locale: zhTW })}
                            </span>
                            <span className="text-indigo-500 dark:text-indigo-500">
                              ({formatDistanceToNow(new Date(activity.timestamp), {
                                addSuffix: true,
                                locale: zhTW,
                              })})
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-indigo-700 dark:text-indigo-300">尚無最近活動</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

