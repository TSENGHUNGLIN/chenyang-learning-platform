import { LucideIcon } from "lucide-react";
import BreadcrumbNav from "./BreadcrumbNav";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  color?: string;
  bgGradient?: string;
  breadcrumbs?: Array<{ label: string; path?: string }>;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  description,
  icon: Icon,
  color = "blue",
  bgGradient = "from-blue-500/10 to-blue-600/5",
  breadcrumbs = [],
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-6">
      {/* 麵包屑導航 */}
      {breadcrumbs.length > 0 && <BreadcrumbNav items={breadcrumbs} />}

      {/* 頁面標題區塊 - 蘋果風格 */}
      <div className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-8 shadow-sm",
        bgGradient
      )}>
        {/* 裝飾性背景圖案 */}
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-5">
          {Icon && <Icon className="h-full w-full" strokeWidth={0.5} />}
        </div>

        {/* 內容區 */}
        <div className="relative flex items-start justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            {/* 圖示色塊 */}
            {Icon && (
              <div className={cn(
                "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-lg",
                `bg-${color}-500 text-white`
              )}
              style={{
                backgroundColor: `var(--${color}-500, hsl(var(--primary)))`,
              }}>
                <Icon className="h-7 w-7" strokeWidth={2} />
              </div>
            )}

            {/* 標題與描述 */}
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
                {title}
              </h1>
              {description && (
                <p className="text-base text-muted-foreground max-w-2xl">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* 操作按鈕區 */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

