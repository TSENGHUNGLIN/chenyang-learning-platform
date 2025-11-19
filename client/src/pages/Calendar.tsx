import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle, Users, User } from "lucide-react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPermissions } from "@shared/permissions";

export default function CalendarView() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<"my" | "all">("my"); // 檢視模式：我的考試 / 所有考試
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("month"); // 日曆模式：月檢視 / 週檢視
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");

  // 查詢我的考試
  const { data: myAssignmentsData } = trpc.exams.myAssignments.useQuery();
  
  // 查詢所有考試（管理者/編輯者專用）
  const { data: allAssignmentsData } = trpc.exams.allAssignments.useQuery(
    undefined,
    { enabled: viewMode === "all" && user?.role && ["admin", "editor"].includes(user.role) }
  );
  
  // 查詢所有部門（用於篩選）
  const { data: departments } = trpc.departments.list.useQuery();
  
  // 查詢所有使用者（用於篩選）
  const { data: allUsers } = trpc.users.list.useQuery(
    undefined,
    { enabled: viewMode === "all" }
  );

  // 根據檢視模式選擇資料源
  const assignments = viewMode === "my" ? (myAssignmentsData || []) : (allAssignmentsData || []);

  // 篩選考試
  const filteredAssignments = assignments.filter((item: any) => {
    if (filterDepartment !== "all") {
      // 根據考生所屬部門篩選（需要從 user 資料中取得部門資訊）
      // 這裡簡化處理，實際應該從 user 資料中取得
      return true; // TODO: 實作部門篩選
    }
    if (filterUser !== "all") {
      return item.assignment.userId === parseInt(filterUser);
    }
    return true;
  });

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

  // 週檢視相關邏輯
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // 調整到週日
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date: Date) => {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  };

  const weekStart = getWeekStart(currentDate);
  const weekEnd = getWeekEnd(currentDate);

  const prevWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  const goToThisWeek = () => {
    setCurrentDate(new Date());
  };

  // 取得週檢視的日期陣列（周日到周六）
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDaysArray = getWeekDays();

  // 取得某一天的考試（週檢視用）
  const getExamsForDateObj = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    return filteredAssignments.filter((item: any) => {
      if (!item.assignment.deadline) return false;
      const deadlineStr = new Date(item.assignment.deadline).toISOString().split("T")[0];
      return deadlineStr === dateStr;
    });
  };

  // 取得某一天的考試
  const getExamsForDate = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return filteredAssignments.filter((item: any) => {
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
    pending: filteredAssignments.filter((a: any) => a.assignment.status === "pending").length,
    inProgress: filteredAssignments.filter((a: any) => a.assignment.status === "in_progress").length,
    submitted: filteredAssignments.filter((a: any) => a.assignment.status === "submitted").length,
    graded: filteredAssignments.filter((a: any) => a.assignment.status === "graded").length,
    overdue: filteredAssignments.filter((a: any) => 
      a.assignment.status === "pending" && 
      a.assignment.deadline && 
      new Date(a.assignment.deadline) < new Date()
    ).length,
  };

  // 檢查使用者是否有全域檢視權限
  const canViewAll = user?.role && getPermissions(user.role as any).canViewAll;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">評核日曆</h1>
            <p className="text-muted-foreground mt-2">查看所有評核考試的截止日期和狀態</p>
          </div>
          
          {/* 檢視模式切換 */}
          {canViewAll && (
            <div className="flex gap-2">
              <Button
                variant={viewMode === "my" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode("my");
                  setFilterDepartment("all");
                  setFilterUser("all");
                }}
              >
                <User className="h-4 w-4 mr-2" />
                我的考試
              </Button>
              <Button
                variant={viewMode === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("all")}
              >
                <Users className="h-4 w-4 mr-2" />
                所有考試
              </Button>
            </div>
          )}
        </div>

        {/* 篩選器（全域檢視模式下顯示） */}
        {viewMode === "all" && canViewAll && (
          <Card>
            <CardHeader>
              <CardTitle>篩選條件</CardTitle>
              <CardDescription>選擇要查看的考生範圍</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 按考生篩選 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">考生</label>
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="所有考生" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有考生</SelectItem>
                      {allUsers?.filter(u => u.role === "examinee").map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name || u.email || `使用者 ${u.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
              <div className="flex items-center gap-4">
                <CardTitle>
                  {calendarMode === "month" ? `${year} 年 ${monthNames[month]}` : `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`}
                </CardTitle>
                {/* 月/週檢視切換 */}
                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    variant={calendarMode === "month" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCalendarMode("month")}
                    className="h-7 px-3"
                  >
                    月檢視
                  </Button>
                  <Button
                    variant={calendarMode === "week" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCalendarMode("week")}
                    className="h-7 px-3"
                  >
                    週檢視
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                {calendarMode === "month" ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <Button variant="outline" size="sm" onClick={prevWeek}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={goToThisWeek}
                    >
                      本週
                    </Button>
                    <Button variant="outline" size="sm" onClick={nextWeek}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {calendarMode === "month" ? (
              /* 月檢視 */
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
                                  title={`${item.exam?.title || "未知考試"}${viewMode === "all" && item.user ? `\n考生：${item.user.name || item.user.email}` : ""}\n狀態：${getStatusText(item.assignment.status, item.assignment.deadline)}`}
                                >
                                  <div className="flex items-center gap-1 mb-0.5">
                                    {getStatusIcon(item.assignment.status, item.assignment.deadline)}
                                    <span className="font-medium truncate">
                                      {item.exam?.title || "未知考試"}
                                    </span>
                                  </div>
                                  {viewMode === "all" && item.user && (
                                    <div className="text-[10px] opacity-70 truncate">
                                      {item.user.name || item.user.email}
                                    </div>
                                  )}
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
            ) : (
              /* 週檢視 */
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center font-semibold text-sm text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
                {weekDaysArray.map((date, index) => {
                  const examsForDay = getExamsForDateObj(date);
                  const hasExams = examsForDay && examsForDay.length > 0;
                  const isToday = date.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`min-h-40 border rounded-lg p-2 transition-all bg-white hover:shadow-md ${
                        isToday ? "ring-2 ring-primary" : ""
                      } ${hasExams ? "border-primary" : ""}`}
                    >
                      <div className={`text-sm font-medium mb-2 ${
                        isToday ? "text-primary font-bold" : ""
                      }`}>
                        <div>{date.getMonth() + 1}/{date.getDate()}</div>
                        {isToday && <span className="text-xs">(今天)</span>}
                      </div>
                      {hasExams && (
                        <div className="space-y-1">
                          {examsForDay.map((item: any) => (
                            <div
                              key={item.assignment.id}
                              className={`text-xs px-2 py-1.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${
                                getStatusColor(
                                  item.assignment.status,
                                  item.assignment.deadline
                                )
                              }`}
                              onClick={() => {
                                if (item.assignment.status === "graded") {
                                  setLocation(`/exam/${item.assignment.id}/result`);
                                } else if (item.assignment.status === "pending") {
                                  setLocation(`/exams/${item.exam.id}`);
                                } else {
                                  setLocation(`/exam/${item.assignment.id}/take`);
                                }
                              }}
                              title={`${item.exam?.title || "未知考試"}${
                                viewMode === "all" && item.user
                                  ? `\n考生：${item.user.name || item.user.email}`
                                  : ""
                              }\n狀態：${getStatusText(
                                item.assignment.status,
                                item.assignment.deadline
                              )}`}
                            >
                              <div className="flex items-center gap-1 mb-0.5">
                                {getStatusIcon(
                                  item.assignment.status,
                                  item.assignment.deadline
                                )}
                                <span className="font-medium truncate">
                                  {item.exam?.title || "未知考試"}
                                </span>
                              </div>
                              {viewMode === "all" && item.user && (
                                <div className="text-[10px] opacity-70 truncate">
                                  {item.user.name || item.user.email}
                                </div>
                              )}
                              <div className="text-[10px] opacity-80">
                                {getStatusText(
                                  item.assignment.status,
                                  item.assignment.deadline
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

