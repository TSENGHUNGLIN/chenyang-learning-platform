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
import { FolderTree, Plus, Pencil, Trash2, Home } from "lucide-react";
import { toast } from "sonner";

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
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4 mr-2" />
            返回首頁
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新增分類
          </Button>
        </div>

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

