import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [, setLocation] = useLocation();
  const { data: assignmentsData } = trpc.exams.myAssignments.useQuery();
  const assignments = assignmentsData || [];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // 取得某一天的考試
  const getExamsForDate = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return assignments.filter((item: any) => {
      if (!item.assignment.deadline) return false;
      const deadlineStr = new Date(item.assignment.deadline).toISOString().split("T")[0];
      return deadlineStr === dateStr;
    });
  };

  // 取得考試狀態顏色
  const getStatusColor = (status: string, deadline: Date | null) => {
    if (status === "graded") return "bg-green-100 text-green-800 border-green-300";
    if (status === "submitted") return "bg-blue-100 text-blue-800 border-blue-300";
    if (status === "in_progress") return "bg-yellow-100 text-yellow-800 border-yellow-300";
    
    // 待考試：檢查是否逾期
    if (deadline && new Date(deadline) < new Date()) {
      return "bg-red-100 text-red-800 border-red-300"; // 逾期
    }
    
    // 待考試：檢查是否即將到期（3天內）
    if (deadline) {
      const daysUntilDeadline = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDeadline <= 3) {
        return "bg-orange-100 text-orange-800 border-orange-300"; // 即將到期
      }
    }
    
    return "bg-gray-100 text-gray-800 border-gray-300"; // 一般待考
  };

  // 取得狀態文字
  const getStatusText = (status: string, deadline: Date | null) => {
    if (status === "graded") return "已評分";
    if (status === "submitted") return "已提交";
    if (status === "in_progress") return "進行中";
    
    if (deadline && new Date(deadline) < new Date()) {
      return "已逾期";
    }
    
    return "待考試";
  };

  // 取得狀態圖示
  const getStatusIcon = (status: string, deadline: Date | null) => {
    if (status === "graded") return <CheckCircle2 className="h-3 w-3" />;
    if (status === "submitted") return <Clock className="h-3 w-3" />;
    if (status === "in_progress") return <CalendarIcon className="h-3 w-3" />;
    
    if (deadline && new Date(deadline) < new Date()) {
      return <AlertCircle className="h-3 w-3" />;
    }
    
    return <CalendarIcon className="h-3 w-3" />;
  };

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const monthNames = [
    "一月", "二月", "三月", "四月", "五月", "六月",
    "七月", "八月", "九月", "十月", "十一月", "十二月",
  ];

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // 統計各狀態的考試數量
  const stats = {
    pending: assignments.filter((a: any) => a.assignment.status === "pending").length,
    inProgress: assignments.filter((a: any) => a.assignment.status === "in_progress").length,
    submitted: assignments.filter((a: any) => a.assignment.status === "submitted").length,
    graded: assignments.filter((a: any) => a.assignment.status === "graded").length,
    overdue: assignments.filter((a: any) => 
      a.assignment.status === "pending" && 
      a.assignment.deadline && 
      new Date(a.assignment.deadline) < new Date()
    ).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">評核日曆</h1>
          <p className="text-muted-foreground mt-2">查看所有評核考試的截止日期和狀態</p>
        </div>

        {/* 統計卡片 */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>待考試</CardDescription>
              <CardTitle className="text-3xl">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>進行中</CardDescription>
              <CardTitle className="text-3xl text-yellow-600">{stats.inProgress}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已提交</CardDescription>
              <CardTitle className="text-3xl text-blue-600">{stats.submitted}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已評分</CardDescription>
              <CardTitle className="text-3xl text-green-600">{stats.graded}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>已逾期</CardDescription>
              <CardTitle className="text-3xl text-red-600">{stats.overdue}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* 日曆 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {year} 年 {monthNames[month]}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentDate(new Date())}
                >
                  今天
                </Button>
                <Button variant="outline" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-sm text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
              {calendarDays.map((day, index) => {
                const examsForDay = day ? getExamsForDate(day) : [];
                const hasExams = examsForDay && examsForDay.length > 0;
                const isToday = day === new Date().getDate() && 
                               month === new Date().getMonth() && 
                               year === new Date().getFullYear();

                return (
                  <div
                    key={index}
                    className={`min-h-28 border rounded-lg p-2 transition-all ${
                      day ? "bg-white hover:shadow-md" : "bg-gray-50"
                    } ${isToday ? "ring-2 ring-primary" : ""} ${
                      hasExams ? "border-primary" : ""
                    }`}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium mb-2 ${isToday ? "text-primary font-bold" : ""}`}>
                          {day}
                          {isToday && <span className="ml-1 text-xs">(今天)</span>}
                        </div>
                        {hasExams && (
                          <div className="space-y-1">
                            {examsForDay.map((item: any) => (
                              <div
                                key={item.assignment.id}
                                className={`text-xs px-2 py-1.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(
                                  item.assignment.status,
                                  item.assignment.deadline
                                )}`}
                                onClick={() => {
                                  if (item.assignment.status === "graded") {
                                    setLocation(`/exam/${item.assignment.id}/result`);
                                  } else if (item.assignment.status === "pending") {
                                    setLocation(`/exams/${item.exam.id}`);
                                  } else {
                                    setLocation(`/exam/${item.assignment.id}/take`);
                                  }
                                }}
                                title={`${item.exam?.title || "未知考試"}\n狀態：${getStatusText(item.assignment.status, item.assignment.deadline)}`}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  {getStatusIcon(item.assignment.status, item.assignment.deadline)}
                                  <span className="font-medium truncate">
                                    {item.exam?.title || "未知考試"}
                                  </span>
                                </div>
                                <div className="text-[10px] opacity-80">
                                  {getStatusText(item.assignment.status, item.assignment.deadline)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 圖例 */}
        <Card>
          <CardHeader>
            <CardTitle>圖例</CardTitle>
            <CardDescription>考試狀態說明</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-100 border border-gray-300"></div>
                <span className="text-sm">待考試</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300"></div>
                <span className="text-sm">即將到期（3天內）</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                <span className="text-sm">進行中</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-100 border border-blue-300"></div>
                <span className="text-sm">已提交</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-300"></div>
                <span className="text-sm">已評分</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-300"></div>
                <span className="text-sm">已逾期</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

