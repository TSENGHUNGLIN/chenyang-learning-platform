import { LucideIcon, LayoutDashboard, Calendar, FolderTree, Tag, FileText, Sparkles, BookOpen, Database, FileStack, ClipboardList, Award, RefreshCw, Activity, Settings, Users } from "lucide-react";

export interface PageConfig {
  path: string;
  label: string;
  icon: LucideIcon;
  color: string; // Tailwind color class for the accent color
  bgGradient: string; // Background gradient classes
  breadcrumbs: Array<{ label: string; path?: string }>;
}

// 蘋果風格的色彩配置
export const pageConfigs: Record<string, PageConfig> = {
  "/": {
    path: "/",
    label: "首頁",
    icon: LayoutDashboard,
    color: "blue",
    bgGradient: "from-blue-500/10 to-blue-600/5",
    breadcrumbs: [],
  },
  "/calendar": {
    path: "/calendar",
    label: "評核日曆",
    icon: Calendar,
    color: "purple",
    bgGradient: "from-purple-500/10 to-purple-600/5",
    breadcrumbs: [{ label: "評核日曆" }],
  },
  "/categories": {
    path: "/categories",
    label: "分類管理",
    icon: FolderTree,
    color: "emerald",
    bgGradient: "from-emerald-500/10 to-emerald-600/5",
    breadcrumbs: [{ label: "分類管理" }],
  },
  "/tags": {
    path: "/tags",
    label: "標籤管理",
    icon: Tag,
    color: "amber",
    bgGradient: "from-amber-500/10 to-amber-600/5",
    breadcrumbs: [{ label: "標籤管理" }],
  },
  "/files": {
    path: "/files",
    label: "檔案管理",
    icon: FileText,
    color: "pink",
    bgGradient: "from-pink-500/10 to-pink-600/5",
    breadcrumbs: [{ label: "檔案管理" }],
  },
  "/ai-analysis": {
    path: "/ai-analysis",
    label: "AI 分析出題",
    icon: Sparkles,
    color: "orange",
    bgGradient: "from-orange-500/10 to-orange-600/5",
    breadcrumbs: [{ label: "AI 分析出題" }],
  },
  "/question-bank": {
    path: "/question-bank",
    label: "題庫管理",
    icon: BookOpen,
    color: "indigo",
    bgGradient: "from-indigo-500/10 to-indigo-600/5",
    breadcrumbs: [{ label: "題庫管理" }],
  },
  "/question-banks": {
    path: "/question-banks",
    label: "題庫檔案",
    icon: Database,
    color: "cyan",
    bgGradient: "from-cyan-500/10 to-cyan-600/5",
    breadcrumbs: [{ label: "題庫檔案" }],
  },
  "/exam-templates": {
    path: "/exam-templates",
    label: "考卷範本",
    icon: FileStack,
    color: "violet",
    bgGradient: "from-violet-500/10 to-violet-600/5",
    breadcrumbs: [{ label: "考卷範本" }],
  },
  "/my-exams": {
    path: "/my-exams",
    label: "考試園地",
    icon: ClipboardList,
    color: "sky",
    bgGradient: "from-sky-500/10 to-sky-600/5",
    breadcrumbs: [{ label: "考試園地" }],
  },
  "/exams": {
    path: "/exams",
    label: "考試管理",
    icon: Award,
    color: "rose",
    bgGradient: "from-rose-500/10 to-rose-600/5",
    breadcrumbs: [{ label: "考試管理" }],
  },
  "/makeup-exams": {
    path: "/makeup-exams",
    label: "補考管理",
    icon: RefreshCw,
    color: "teal",
    bgGradient: "from-teal-500/10 to-teal-600/5",
    breadcrumbs: [{ label: "補考管理" }],
  },
  "/exam-monitoring": {
    path: "/exam-monitoring",
    label: "考試監控",
    icon: Activity,
    color: "red",
    bgGradient: "from-red-500/10 to-red-600/5",
    breadcrumbs: [{ label: "考試監控" }],
  },
  "/manage": {
    path: "/manage",
    label: "部門人員",
    icon: Settings,
    color: "slate",
    bgGradient: "from-slate-500/10 to-slate-600/5",
    breadcrumbs: [{ label: "部門人員" }],
  },
  "/users": {
    path: "/users",
    label: "使用者管理",
    icon: Users,
    color: "zinc",
    bgGradient: "from-zinc-500/10 to-zinc-600/5",
    breadcrumbs: [{ label: "使用者管理" }],
  },
};

// 根據路徑取得頁面配置
export function getPageConfig(path: string): PageConfig | undefined {
  return pageConfigs[path];
}

// 取得麵包屑項目
export function getBreadcrumbs(path: string): Array<{ label: string; path?: string }> {
  const config = getPageConfig(path);
  return config?.breadcrumbs || [];
}

