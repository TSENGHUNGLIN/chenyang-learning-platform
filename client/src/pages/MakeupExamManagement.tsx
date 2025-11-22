import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Calendar, AlertCircle, CheckCircle2, Clock, Home } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function MakeupExamManagement() {
  const [, setLocation] = useLocation();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedMakeup, setSelectedMakeup] = useState<any>(null);
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const { data: pendingMakeups, isLoading, refetch } = trpc.makeupExams.getPending.useQuery();
  const scheduleMutation = trpc.makeupExams.schedule.useMutation({
    onSuccess: () => {
      toast.success("補考已成功安排");
      setScheduleDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`安排補考失敗：${error.message}`);
    },
  });

  const handleScheduleMakeup = (makeup: any) => {
    setSelectedMakeup(makeup);
    setDeadline("");
    setNotes("");
    setScheduleDialogOpen(true);
  };

  const handleConfirmSchedule = () => {
    if (!selectedMakeup || !deadline) {
      toast.error("請填寫截止日期");
      return;
    }

    scheduleMutation.mutate({
      makeupExamId: selectedMakeup.makeupExam.id,
      deadline,
      notes,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: "待安排", className: "bg-yellow-100 text-yellow-800", icon: Clock },
      scheduled: { label: "已安排", className: "bg-blue-100 text-blue-800", icon: Calendar },
      completed: { label: "已完成", className: "bg-green-100 text-green-800", icon: CheckCircle2 },
      expired: { label: "已過期", className: "bg-red-100 text-red-800", icon: AlertCircle },
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    const Icon = statusInfo.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">補考管理</h1>
          <p className="text-muted-foreground mt-2">管理不及格考生的補考安排</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/")}>
          <Home className="h-4 w-4 mr-2" />
          返回首頁
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>待補考列表</CardTitle>
          <CardDescription>
            共 {pendingMakeups?.length || 0} 位考生需要安排補考
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!pendingMakeups || pendingMakeups.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">目前沒有待補考的考生</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>考生姓名</TableHead>
                  <TableHead>考試名稱</TableHead>
                  <TableHead>原始分數</TableHead>
                  <TableHead>補考次數</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>建立時間</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingMakeups.map((item: any) => (
                  <TableRow key={item.makeupExam.id}>
                    <TableCell className="font-medium">
                      {item.user?.name || "未知"}
                    </TableCell>
                    <TableCell>{item.exam?.title || "未知考試"}</TableCell>
                    <TableCell>
                      <span className="text-red-600 font-semibold">
                        {item.makeupExam.originalScore || 0} 分
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.makeupExam.makeupCount} / {item.makeupExam.maxMakeupAttempts}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.makeupExam.status)}</TableCell>
                    <TableCell>
                      {new Date(item.makeupExam.createdAt).toLocaleString("zh-TW")}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.makeupExam.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleScheduleMakeup(item)}
                          disabled={
                            item.makeupExam.makeupCount > item.makeupExam.maxMakeupAttempts
                          }
                        >
                          <Calendar className="h-4 w-4 mr-2" />
                          安排補考
                        </Button>
                      )}
                      {item.makeupExam.status === "scheduled" && (
                        <span className="text-sm text-muted-foreground">已安排</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 安排補考對話框 */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>安排補考</DialogTitle>
            <DialogDescription>
              為 {selectedMakeup?.user?.name} 安排補考時間
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exam-title">考試名稱</Label>
              <Input
                id="exam-title"
                value={selectedMakeup?.exam?.title || ""}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="original-score">原始分數</Label>
              <Input
                id="original-score"
                value={`${selectedMakeup?.makeupExam?.originalScore || 0} 分`}
                disabled
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">補考截止日期 *</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">備註</Label>
              <Textarea
                id="notes"
                placeholder="輸入補考相關備註（選填）"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmSchedule}
              disabled={!deadline || scheduleMutation.isPending}
            >
              {scheduleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              確認安排
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

