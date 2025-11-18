import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Users, TrendingUp, Search, BookOpen, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/files?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const features = [
    {
      icon: Calendar,
      title: "日曆檢視",
      description: "查看所有檔案的上傳日期，以日曆形式呈現",
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
      description: "管理所有上傳的考核問答檔案，支援搜尋與篩選",
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">歡迎回來，{user?.name || "使用者"}</h1>
          <p className="text-muted-foreground mt-2">晨陽設計新人考核測驗</p>
        </div>

        {/* 快速搜尋 */}
        <Card>
          <CardHeader>
            <CardTitle>快速搜尋</CardTitle>
            <CardDescription>搜尋檔案內容、人員或部門</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="輸入關鍵字搜尋..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button type="submit">搜尋</Button>
            </form>
          </CardContent>
        </Card>

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


      </div>
    </DashboardLayout>
  );
}

