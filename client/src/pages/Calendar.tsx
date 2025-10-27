import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data: filesData } = trpc.files.list.useQuery({});
  const files = filesData?.files || [];
  const { data: employees } = trpc.employees.list.useQuery();
  const { data: departments } = trpc.departments.list.useQuery();

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

  const getFilesForDate = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split("T")[0];
    return files?.filter((file: any) => {
      const fileDate = new Date(file.uploadDate).toISOString().split("T")[0];
      return fileDate === dateStr;
    });
  };

  const getDepartmentColor = (employeeId: number) => {
    const employee = employees?.find((e) => e.id === employeeId);
    if (!employee) return "bg-gray-200";
    
    const department = departments?.find((d) => d.id === employee.departmentId);
    if (!department) return "bg-gray-200";

    // 根據部門名稱返回不同顏色
    const colors: Record<string, string> = {
      "業管部": "bg-blue-200",
      "行銷部": "bg-purple-200",
      "設計部": "bg-pink-200",
      "業務部": "bg-green-200",
      "工務部": "bg-orange-200",
    };

    return colors[department.name] || "bg-gray-200";
  };

  const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
  const monthNames = [
    "一月",
    "二月",
    "三月",
    "四月",
    "五月",
    "六月",
    "七月",
    "八月",
    "九月",
    "十月",
    "十一月",
    "十二月",
  ];

  const calendarDays = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">日曆檢視</h1>
          <p className="text-muted-foreground mt-2">查看所有檔案的上傳日期</p>
        </div>

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
                const filesForDay = day ? getFilesForDate(day) : [];
                const hasFiles = filesForDay && filesForDay.length > 0;

                return (
                  <div
                    key={index}
                    className={`min-h-24 border rounded-lg p-2 ${
                      day ? "bg-white" : "bg-gray-50"
                    } ${hasFiles ? "ring-2 ring-blue-500" : ""}`}
                  >
                    {day && (
                      <>
                        <div className="text-sm font-medium mb-2">{day}</div>
                        {hasFiles && (
                          <div className="space-y-1">
                            {filesForDay.map((file: any) => (
                              <div
                                key={file.id}
                                className={`text-xs px-2 py-1 rounded ${getDepartmentColor(
                                  file.employeeId
                                )} truncate`}
                                title={file.filename}
                              >
                                {employees?.find((e) => e.id === file.employeeId)?.name}
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

        <Card>
          <CardHeader>
            <CardTitle>圖例</CardTitle>
            <CardDescription>部門顏色說明</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-200"></div>
                <span className="text-sm">業管部</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-purple-200"></div>
                <span className="text-sm">行銷部</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-pink-200"></div>
                <span className="text-sm">設計部</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-200"></div>
                <span className="text-sm">業務部</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-orange-200"></div>
                <span className="text-sm">工務部</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

