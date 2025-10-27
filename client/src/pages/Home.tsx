import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, FileText, Users, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user } = useAuth();

  const features = [
    {
      icon: Calendar,
      title: "日曆檢視",
      description: "查看所有檔案的上傳日期，以日曆形式呈現",
      link: "/calendar",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: FileText,
      title: "檔案管理",
      description: "管理所有上傳的考核問答檔案，支援搜尋與篩選",
      link: "/files",
      color: "from-purple-500 to-pink-500",
    },
    {
      icon: TrendingUp,
      title: "AI 分析",
      description: "使用 AI 分析考核問答內容，提供深入見解",
      link: "/files",
      color: "from-orange-500 to-red-500",
    },
    ...(user?.role === "admin"
      ? [
          {
            icon: Users,
            title: "使用者管理",
            description: "管理系統使用者與權限設定",
            link: "/users",
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
          <p className="text-muted-foreground mt-2">晨陽新人成長學習題庫分析系統</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.title} href={feature.link}>
                <a>
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
                </a>
              </Link>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>系統資訊</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">使用者角色：</span>
              <span className="font-medium capitalize">{user?.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">登入方式：</span>
              <span className="font-medium">{user?.loginMethod || "Google"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">電子郵件：</span>
              <span className="font-medium">{user?.email || "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

