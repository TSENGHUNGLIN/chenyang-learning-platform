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
import { Tag, Plus, Pencil, Trash2, Home, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  const [showGuide, setShowGuide] = useState(false);

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
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <Home className="h-4 w-4 mr-2" />
              返回首頁
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增標籤
            </Button>
          </div>
        </div>

        {/* 操作指南 */}
        <Collapsible open={showGuide} onOpenChange={setShowGuide}>
          <Alert className="bg-green-50 border-green-200">
            <Info className="h-4 w-4 text-green-600" />
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <AlertTitle className="text-green-900 font-semibold mb-2">標籤管理操作指南</AlertTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-green-700 hover:text-green-900">
                    {showGuide ? "收起指南" : "展開指南"}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="mt-3">
              <AlertDescription className="text-green-800 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">🏷️ 功能說明</h4>
                  <p className="text-sm leading-relaxed">
                    標籤用於為題目加上多維度的標記，與分類不同的是，一個題目可以擁有多個標籤。
                    例如，一道 Python 題目可以同時擁有「基礎題」、「常考題」、「重要」等標籤。
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">✨ 使用步驟</h4>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li><strong>新增標籤：</strong>點擊右上角「新增標籤」按鈕，輸入標籤名稱並選擇顏色。顏色用於在界面中區分不同標籤。</li>
                    <li><strong>編輯標籤：</strong>點擊表格中的編輯按鈕（鉛筆圖示），修改標籤名稱或顏色。</li>
                    <li><strong>刪除標籤：</strong>點擊表格中的刪除按鈕（垃圾桶圖示）。注意：刪除標籤不會刪除題目，只會移除標籤與題目的關聯。</li>
                    <li><strong>查看使用情況：</strong>表格中的「使用次數」欄位顯示有多少題目使用了該標籤。</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">⚠️ 注意事項</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>標籤名稱應簡短有力，建議 2-6 個字，例如：「重要」、「常考題」、「進階」。</li>
                    <li>選擇顏色時，建議使用預設的 8 種顏色，保持視覺一致性。</li>
                    <li>刪除標籤不會影響題目本身，只會移除標籤與題目的關聯。</li>
                    <li>如果標籤已被大量使用，建議不要輕易刪除，可以考慮重新命名。</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💡 最佳實踐</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>建立標籤系統：例如難度標籤（基礎、中等、進階）、重要性標籤（重要、常考題）、主題標籤（資料結構、演算法）。</li>
                    <li>使用不同顏色區分不同類型的標籤：例如藍色系表示難度、綠色系表示主題、紅色系表示重要性。</li>
                    <li>定期檢視標籤使用情況，合併相似的標籤，刪除不再使用的標籤。</li>
                    <li>在題庫管理中，利用標籤篩選功能快速找到特定類型的題目。</li>
                  </ul>
                </div>
              </AlertDescription>
            </CollapsibleContent>
          </Alert>
        </Collapsible>

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

