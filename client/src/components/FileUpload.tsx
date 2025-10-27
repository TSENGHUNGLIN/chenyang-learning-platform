import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Upload, Loader2, X, FileText, Link as LinkIcon, Type } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const MAX_FILES = 5;

export default function FileUpload() {
  const [open, setOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [googleDriveLink, setGoogleDriveLink] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("file");

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const createFileMutation = trpc.files.create.useMutation();
  const createTextMutation = trpc.files.createFromText.useMutation();
  const utils = trpc.useUtils();

  // 根據選擇的部門篩選人員
  const filteredEmployees = selectedDepartment
    ? employees?.filter((emp) => emp.departmentId === parseInt(selectedDepartment))
    : employees;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      const validFiles = selectedFiles.filter((file) => {
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name} 不是支援的檔案格式`);
          return false;
        }
        return true;
      });

      if (validFiles.length + files.length > MAX_FILES) {
        toast.error(`最多只能上傳 ${MAX_FILES} 個檔案`);
        return;
      }

      setFiles([...files, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleFileUpload = async () => {
    if (files.length === 0 || !selectedEmployee) {
      toast.error("請選擇檔案和人員");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = files.length;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("employeeId", selectedEmployee);

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            toast.error(`${file.name} 上傳失敗`);
          }
        } catch (error) {
          failCount++;
          toast.error(`${file.name} 上傳失敗`);
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      if (successCount > 0) {
        toast.success(`成功上傳 ${successCount} 個檔案`);
        await utils.files.list.invalidate();
        setFiles([]);
        setSelectedDepartment("");
        setSelectedEmployee("");
        setOpen(false);
      }

      if (failCount > 0) {
        toast.error(`${failCount} 個檔案上傳失敗`);
      }
    } catch (error) {
      toast.error("上傳失敗，請稍後再試");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleGoogleDriveUpload = async () => {
    if (!googleDriveLink || !selectedEmployee) {
      toast.error("請輸入Google雲端連結和選擇人員");
      return;
    }

    setUploading(true);

    try {
      await createTextMutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        fileName: "Google雲端文件",
        content: `Google雲端連結：${googleDriveLink}`,
        fileUrl: googleDriveLink,
      });

      toast.success("Google雲端連結已儲存");
      await utils.files.list.invalidate();
      setGoogleDriveLink("");
      setSelectedDepartment("");
      setSelectedEmployee("");
      setOpen(false);
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
    } finally {
      setUploading(false);
    }
  };

  const handleTextUpload = async () => {
    if (!textContent || !textTitle || !selectedEmployee) {
      toast.error("請輸入標題、內容和選擇人員");
      return;
    }

    setUploading(true);

    try {
      await createTextMutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        fileName: textTitle,
        content: textContent,
        fileUrl: "",
      });

      toast.success("文字內容已儲存");
      await utils.files.list.invalidate();
      setTextContent("");
      setTextTitle("");
      setSelectedDepartment("");
      setSelectedEmployee("");
      setOpen(false);
    } catch (error) {
      toast.error("儲存失敗，請稍後再試");
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = () => {
    if (activeTab === "file") {
      handleFileUpload();
    } else if (activeTab === "link") {
      handleGoogleDriveUpload();
    } else if (activeTab === "text") {
      handleTextUpload();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          上傳檔案
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>上傳檔案</DialogTitle>
          <DialogDescription>選擇部門、人員，並上傳檔案、連結或文字內容</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 部門選擇 */}
          <div className="space-y-2">
            <Label htmlFor="department">部門</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger>
                <SelectValue placeholder="選擇部門" />
              </SelectTrigger>
              <SelectContent>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 人員選擇 */}
          <div className="space-y-2">
            <Label htmlFor="employee">人員</Label>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              disabled={!selectedDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedDepartment ? "選擇人員" : "請先選擇部門"} />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 上傳方式選擇 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="file">
                <FileText className="mr-2 h-4 w-4" />
                檔案上傳
              </TabsTrigger>
              <TabsTrigger value="link">
                <LinkIcon className="mr-2 h-4 w-4" />
                雲端連結
              </TabsTrigger>
              <TabsTrigger value="text">
                <Type className="mr-2 h-4 w-4" />
                直接貼文
              </TabsTrigger>
            </TabsList>

            {/* 檔案上傳 */}
            <TabsContent value="file" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">選擇檔案（PDF、DOCX，最多{MAX_FILES}個）</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.docx"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>已選擇的檔案（{files.length}/{MAX_FILES}）</Label>
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Google雲端連結 */}
            <TabsContent value="link" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="google-link">Google雲端文件連結</Label>
                <Input
                  id="google-link"
                  type="url"
                  placeholder="https://docs.google.com/..."
                  value={googleDriveLink}
                  onChange={(e) => setGoogleDriveLink(e.target.value)}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground">
                  請確保連結已設定為「知道連結的任何人都可以檢視」
                </p>
              </div>
            </TabsContent>

            {/* 直接貼文 */}
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-title">標題</Label>
                <Input
                  id="text-title"
                  type="text"
                  placeholder="輸入標題"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  disabled={uploading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-content">內容</Label>
                <Textarea
                  id="text-content"
                  placeholder="貼上或輸入文字內容"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  disabled={uploading}
                  rows={10}
                />
              </div>
            </TabsContent>
          </Tabs>

          {uploading && uploadProgress > 0 && (
            <div className="space-y-2">
              <Label>上傳進度</Label>
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
              取消
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedEmployee}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  上傳中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  上傳
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

