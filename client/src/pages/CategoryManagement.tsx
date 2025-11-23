import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { FolderTree, Plus, Pencil, Trash2, Home, Info } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function CategoryManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    parentId: undefined as number | undefined,
    description: "",
  });

  const { data: categories, refetch: refetchCategories } = trpc.questionCategories.list.useQuery();
  const createMutation = trpc.questionCategories.create.useMutation();
  const updateMutation = trpc.questionCategories.update.useMutation();
  const deleteMutation = trpc.questionCategories.delete.useMutation();

  const resetForm = () => {
    setFormData({
      name: "",
      parentId: undefined,
      description: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("請輸入分類名稱");
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast.success("分類已新增");
      setShowCreateDialog(false);
      resetForm();
      refetchCategories();
    } catch (error: any) {
      toast.error(error.message || "新增失敗");
    }
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentId: category.parentId,
      description: category.description || "",
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!formData.name.trim()) {
      toast.error("請輸入分類名稱");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: editingCategory.id,
        ...formData,
      });
      toast.success("分類已更新");
      setShowEditDialog(false);
      resetForm();
      setEditingCategory(null);
      refetchCategories();
    } catch (error: any) {
      toast.error(error.message || "更新失敗");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`確定要刪除分類「${name}」嗎？`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("分類已刪除");
      refetchCategories();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  const getCategoryPath = (categoryId: number | null): string => {
    if (!categoryId || !categories) return "根分類";
    const category = categories.find((c: any) => c.id === categoryId);
    if (!category) return "根分類";
    if (!category.parentId) return category.name;
    return `${getCategoryPath(category.parentId)} > ${category.name}`;
  };

  const [showGuide, setShowGuide] = useState(true);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FolderTree className="h-8 w-8 text-primary" />
              分類管理
            </h1>
            <p className="text-muted-foreground mt-2">管理題目分類，支援多層級樹狀結構</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <Home className="h-4 w-4 mr-2" />
              返回首頁
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增分類
            </Button>
          </div>
        </div>

        {/* 操作指南 */}
        <Collapsible open={showGuide} onOpenChange={setShowGuide}>
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <AlertTitle className="text-blue-900 font-semibold mb-2">分類管理操作指南</AlertTitle>
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="p-0 h-auto text-blue-700 hover:text-blue-900">
                    {showGuide ? "收起指南" : "展開指南"}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="mt-3">
              <AlertDescription className="text-blue-800 space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📚 功能說明</h4>
                  <p className="text-sm leading-relaxed">
                    分類管理用於組織題目，支援多層級樹狀結構（例如：「程式設計 &gt; Python &gt; 基礎語法」）。
                    合理的分類結構可以幫助您快速找到題目，並在建立考卷時更有效率地篩選題目。
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">✨ 使用步驟</h4>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li><strong>新增分類：</strong>點擊右上角「新增分類」按鈕，輸入分類名稱和描述。可選擇「上層分類」建立子分類。</li>
                    <li><strong>編輯分類：</strong>點擊表格中的編輯按鈕（鉛筆圖示），修改分類名稱、描述或上層分類。</li>
                    <li><strong>刪除分類：</strong>點擊表格中的刪除按鈕（垃圾桶圖示）。注意：刪除分類前請確認該分類下沒有題目。</li>
                    <li><strong>查看層級：</strong>表格中的「完整路徑」欄位顯示分類的完整層級結構。</li>
                  </ol>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">⚠️ 注意事項</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>建議先建立主要分類（例如：「程式設計」、「資料庫」），再建立子分類。</li>
                    <li>分類名稱應簡潔明確，避免過長或含糊不清。</li>
                    <li>刪除分類前，請先將該分類下的題目移至其他分類或刪除。</li>
                    <li>若分類下有子分類，需先刪除所有子分類才能刪除父分類。</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💡 最佳實踐</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>建議分類層級不超過 3 層，避免結構過於複雜。</li>
                    <li>使用描述欄位記錄分類的用途和範圍，方便團隊成員理解。</li>
                    <li>定期檢視分類結構，合併或刪除不再使用的分類。</li>
                  </ul>
                </div>
              </AlertDescription>
            </CollapsibleContent>
          </Alert>
        </Collapsible>

        <Card>
          <CardHeader>
            <CardTitle>所有分類</CardTitle>
            <CardDescription>共 {categories?.length || 0} 個分類</CardDescription>
          </CardHeader>
          <CardContent>
            {!categories || categories.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                尚無分類，請新增分類
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>分類名稱</TableHead>
                    <TableHead>完整路徑</TableHead>
                    <TableHead>說明</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category: any) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getCategoryPath(category.id)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {category.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(category.id, category.name)}
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
            <DialogTitle>新增分類</DialogTitle>
            <DialogDescription>建立新的題目分類</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>分類名稱</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：基礎知識"
              />
            </div>
            <div>
              <Label>父分類（選填）</Label>
              <Select
                value={formData.parentId?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentId: value === "none" ? undefined : parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇父分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無（根分類）</SelectItem>
                  {categories?.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {getCategoryPath(cat.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>說明（選填）</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="分類說明"
                rows={3}
              />
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
            <DialogTitle>編輯分類</DialogTitle>
            <DialogDescription>修改分類資訊</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>分類名稱</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：基礎知識"
              />
            </div>
            <div>
              <Label>父分類（選填）</Label>
              <Select
                value={formData.parentId?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, parentId: value === "none" ? undefined : parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇父分類" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">無（根分類）</SelectItem>
                  {categories
                    ?.filter((cat: any) => cat.id !== editingCategory?.id)
                    .map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {getCategoryPath(cat.id)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>說明（選填）</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="分類說明"
                rows={3}
              />
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

