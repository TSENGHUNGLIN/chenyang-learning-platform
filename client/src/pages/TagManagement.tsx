import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tag, Plus, Pencil, Trash2, Home } from "lucide-react";
import { toast } from "sonner";

export default function TagManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTag, setEditingTag] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "#3b82f6",
  });

  const { data: tags, refetch: refetchTags } = trpc.tags.list.useQuery();
  const createMutation = trpc.tags.create.useMutation();
  const updateMutation = trpc.tags.update.useMutation();
  const deleteMutation = trpc.tags.delete.useMutation();

  const resetForm = () => {
    setFormData({
      name: "",
      color: "#3b82f6",
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("請輸入標籤名稱");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success("標籤已新增");
      setShowCreateDialog(false);
      resetForm();
      refetchTags();
    } catch (error: any) {
      toast.error(error.message || "新增失敗");
    }
  };

  const handleEdit = (tag: any) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || "#3b82f6",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toast.error("請輸入標籤名稱");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingTag.id,
        ...formData,
      });
      toast.success("標籤已更新");
      setShowEditDialog(false);
      resetForm();
      setEditingTag(null);
      refetchTags();
    } catch (error: any) {
      toast.error(error.message || "更新失敗");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`確定要刪除標籤「${name}」嗎？`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("標籤已刪除");
      refetchTags();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  const predefinedColors = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // yellow
    "#ef4444", // red
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f97316", // orange
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Tag className="h-8 w-8 text-primary" />
              標籤管理
            </h1>
            <p className="text-muted-foreground mt-2">管理題目標籤，用於分類和篩選題目</p>
          </div>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新增標籤
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>所有標籤</CardTitle>
            <CardDescription>共 {tags?.length || 0} 個標籤</CardDescription>
          </CardHeader>
          <CardContent>
            {!tags || tags.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                尚無標籤，請新增標籤
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>標籤名稱</TableHead>
                    <TableHead>顏色</TableHead>
                    <TableHead>預覽</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag: any) => (
                    <TableRow key={tag.id}>
                      <TableCell className="font-medium">{tag.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border"
                            style={{ backgroundColor: tag.color || "#3b82f6" }}
                          />
                          <span className="text-sm text-muted-foreground">
                            {tag.color || "#3b82f6"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge style={{ backgroundColor: tag.color || "#3b82f6", color: "white" }}>
                          {tag.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(tag)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tag.id, tag.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增標籤</DialogTitle>
            <DialogDescription>建立新的題目標籤</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>標籤名稱</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：色彩理論"
              />
            </div>
            <div>
              <Label>標籤顏色</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded border-2 transition-all ${
                      formData.color === color ? "border-black scale-110" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>預覽</Label>
              <div className="mt-2">
                <Badge style={{ backgroundColor: formData.color, color: "white" }}>
                  {formData.name || "標籤預覽"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleCreate}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯標籤</DialogTitle>
            <DialogDescription>修改標籤資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>標籤名稱</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：色彩理論"
              />
            </div>
            <div>
              <Label>標籤顏色</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded border-2 transition-all ${
                      formData.color === color ? "border-black scale-110" : "border-gray-300"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <Label>預覽</Label>
              <div className="mt-2">
                <Badge style={{ backgroundColor: formData.color, color: "white" }}>
                  {formData.name || "標籤預覽"}
                </Badge>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdate}>更新</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

