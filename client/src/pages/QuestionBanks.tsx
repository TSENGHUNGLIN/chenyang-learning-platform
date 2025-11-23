import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { trpc } from "@/lib/trpc";
import { FileText, Plus, Trash2, Eye, Calendar, User, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function QuestionBanks() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [newBankDescription, setNewBankDescription] = useState("");
  const [newBankTags, setNewBankTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedBankIds, setSelectedBankIds] = useState<number[]>([]);

  const { data: banks, isLoading, refetch } = trpc.questionBanks.list.useQuery();
  const createBankMutation = trpc.questionBanks.create.useMutation();
  const deleteBankMutation = trpc.questionBanks.delete.useMutation();

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !newBankTags.includes(tag)) {
      setNewBankTags([...newBankTags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewBankTags(newBankTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCreateBank = async () => {
    if (!newBankName.trim()) {
      toast.error("請輸入試卷題庫名稱");
      return;
    }

    try {
      await createBankMutation.mutateAsync({
        name: newBankName,
        description: newBankDescription || undefined,
        tags: newBankTags.length > 0 ? JSON.stringify(newBankTags) : undefined,
      });
      toast.success("試卷題庫建立成功");
      setIsCreateDialogOpen(false);
      setNewBankName("");
      setNewBankDescription("");
      setNewBankTags([]);
      setTagInput("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "建立失敗");
    }
  };

  const handleDeleteBank = async (id: number, name: string) => {
    if (!confirm(`確定要刪除試卷題庫「${name}」嗎？這將移除所有關聯，但不會刪除題目本身。`)) {
      return;
    }

    try {
      await deleteBankMutation.mutateAsync(id);
      toast.success("試卷題庫已刪除");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "刪除失敗");
    }
  };

  const handleToggleSelectBank = (bankId: number) => {
    setSelectedBankIds(prev => 
      prev.includes(bankId) 
        ? prev.filter(id => id !== bankId)
        : [...prev, bankId]
    );
  };

  const handleSelectAll = () => {
    if (!banks) return;
    const filteredBanks = banks.filter((bank) => {
      if (selectedTags.length === 0) return true;
      if (!bank.tags) return false;
      try {
        const bankTags = JSON.parse(bank.tags as string);
        return selectedTags.some((tag) => bankTags.includes(tag));
      } catch {
        return false;
      }
    });
    const allIds = filteredBanks.map(b => b.id);
    setSelectedBankIds(selectedBankIds.length === allIds.length ? [] : allIds);
  };

  const handleBatchDelete = async () => {
    if (selectedBankIds.length === 0) {
      toast.error("請至少選擇一個試卷題庫");
      return;
    }

    if (!confirm(`確定要刪除 ${selectedBankIds.length} 個試卷題庫嗎？這將移除所有關聯，但不會刪除題目本身。`)) {
      return;
    }

    try {
      // 逐個刪除（暂時使用單個刪除 API）
      for (const id of selectedBankIds) {
        await deleteBankMutation.mutateAsync(id);
      }
      toast.success(`已刪除 ${selectedBankIds.length} 個試卷題庫`);
      setSelectedBankIds([]);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "批次刪除失敗");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">載入中...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">試卷題庫管理</h1>
            <p className="text-muted-foreground mt-2">
              組織和管理題目集合，快速派送到考試
            </p>
          </div>
          <div className="flex gap-2">
            {banks && banks.length > 0 && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleSelectAll}
                  disabled={!banks || banks.length === 0}
                >
                  {selectedBankIds.length > 0 ? (
                    <CheckSquare className="h-4 w-4 mr-2" />
                  ) : (
                    <Square className="h-4 w-4 mr-2" />
                  )}
                  {selectedBankIds.length > 0 ? `已選 ${selectedBankIds.length}` : '全選'}
                </Button>
                {selectedBankIds.length > 0 && (
                  <Button 
                    variant="destructive" 
                    onClick={handleBatchDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    批次刪除
                  </Button>
                )}
              </>
            )}
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              建立試卷題庫
            </Button>
          </div>
        </div>

        {banks && banks.length > 0 && (() => {
          const allTags = Array.from(
            new Set(
              banks
                .filter(bank => bank.tags)
                .flatMap(bank => {
                  try {
                    return JSON.parse(bank.tags as string);
                  } catch {
                    return [];
                  }
                })
            )
          );

          return allTags.length > 0 ? (
            <div className="mb-6">
              <Label className="text-sm font-medium mb-2 block">篩選標籤</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedTags.length === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTags([])}
                >
                  全部
                </Button>
                {allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedTags(
                        selectedTags.includes(tag)
                          ? selectedTags.filter((t) => t !== tag)
                          : [...selectedTags, tag]
                      );
                    }}
                  >
                    {tag}
                  </Button>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {!banks || banks.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">尚無試卷題庫</p>
              <p className="text-sm text-muted-foreground mb-4">
                建立試卷題庫來組織和管理題目集合
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                建立第一個試卷題庫
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banks
              .filter((bank) => {
                if (selectedTags.length === 0) return true;
                if (!bank.tags) return false;
                try {
                  const bankTags = JSON.parse(bank.tags as string);
                  return selectedTags.some((tag) => bankTags.includes(tag));
                } catch {
                  return false;
                }
              })
              .map((bank) => (
              <Card 
                key={bank.id} 
                className={`hover:shadow-lg transition-shadow relative ${
                  selectedBankIds.includes(bank.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div 
                  className="absolute top-3 left-3 z-10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelectBank(bank.id);
                  }}
                >
                  {selectedBankIds.includes(bank.id) ? (
                    <CheckSquare className="h-5 w-5 text-primary" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground hover:text-primary" />
                  )}
                </div>
                <CardHeader className="pl-12">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{bank.name}</span>
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      {bank.questionCount} 題
                    </span>
                  </CardTitle>
                  {bank.description && (
                    <CardDescription className="line-clamp-2">
                      {bank.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {bank.tags && (() => {
                    try {
                      const tags = JSON.parse(bank.tags as string);
                      return tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-md text-xs cursor-pointer hover:bg-primary/20 transition-colors"
                              onClick={() => setSelectedTags([tag])}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    } catch {
                      return null;
                    }
                  })()}
                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    {bank.source && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{bank.source}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {new Date(bank.createdAt).toLocaleDateString("zh-TW")}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setLocation(`/question-banks/${bank.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      查看
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBank(bank.id, bank.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>建立試卷題庫</DialogTitle>
              <DialogDescription>
                建立一個新的試卷題庫來組織題目集合
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">檔案名稱 *</Label>
                <Input
                  id="name"
                  placeholder="例如：JavaScript基礎測驗"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  placeholder="選填：描述這個試卷題庫的內容和用途"
                  value={newBankDescription}
                  onChange={(e) => setNewBankDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">標籤</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="輸入標籤後按Enter或逗號"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                  />
                  <Button type="button" variant="outline" onClick={handleAddTag}>
                    新增
                  </Button>
                </div>
                {newBankTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newBankTags.map((tag) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-primary/80"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                取消
              </Button>
              <Button
                onClick={handleCreateBank}
                disabled={createBankMutation.isPending}
              >
                {createBankMutation.isPending ? "建立中..." : "建立"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

