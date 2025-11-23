import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, Database } from "lucide-react";

interface StatisticsPanelProps {
  type: "category" | "tag";
  data: {
    totalCategories?: number;
    totalTags?: number;
    usedCategories?: number;
    usedTags?: number;
    unusedCategories?: number;
    unusedTags?: number;
    mostUsed: Array<{
      id: number;
      name: string;
      color?: string;
      usageCount: number;
    }>;
    unused: Array<{
      id: number;
      name: string;
      color?: string;
    }>;
    recentlyAdded: Array<{
      id: number;
      name: string;
      color?: string;
      createdAt: Date | string | null;
    }>;
  };
}

export function StatisticsPanel({ type, data }: StatisticsPanelProps) {
  const isCategory = type === "category";
  const total = isCategory ? data.totalCategories : data.totalTags;
  const used = isCategory ? data.usedCategories : data.usedTags;
  const unused = isCategory ? data.unusedCategories : data.unusedTags;
  const label = isCategory ? "分類" : "標籤";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
      {/* 總數統計 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">總{label}數</CardTitle>
          <Database className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            已使用 {used || 0} 個 · 未使用 {unused || 0} 個
          </p>
        </CardContent>
      </Card>

      {/* 最常用 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">最常用</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.mostUsed.slice(0, 3).map((item, index) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  {!isCategory && item.color && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="truncate">{item.name}</span>
                </div>
                <Badge variant="secondary" className="ml-2 flex-shrink-0">
                  {item.usageCount}
                </Badge>
              </div>
            ))}
            {data.mostUsed.length === 0 && (
              <p className="text-xs text-muted-foreground">尚無使用記錄</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 未使用 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">未使用</CardTitle>
          <TrendingDown className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unused || 0}</div>
          <div className="mt-2 space-y-1">
            {data.unused.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                {!isCategory && item.color && (
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="truncate">{item.name}</span>
              </div>
            ))}
            {data.unused.length === 0 && (
              <p className="text-xs text-muted-foreground">所有{label}都已使用</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 最近新增 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">最近新增</CardTitle>
          <Calendar className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recentlyAdded.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                {!isCategory && item.color && (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                )}
                <span className="truncate flex-1 min-w-0">{item.name}</span>
              </div>
            ))}
            {data.recentlyAdded.length === 0 && (
              <p className="text-xs text-muted-foreground">尚無{label}資料</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

