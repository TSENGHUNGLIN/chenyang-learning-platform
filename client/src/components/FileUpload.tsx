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
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Upload, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

const MAX_FILES = 5;

export default function FileUpload() {
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const createFileMutation = trpc.files.create.useMutation();
  const utils = trpc.useUtils();

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

  const handleUpload = async () => {
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
        try {
          // Upload file to S3
          const formData = new FormData();
          formData.append("file", file);

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error("檔案上傳失敗");
          }

          const { fileKey, fileUrl, extractedText } = await uploadResponse.json();

          // Save file metadata to database
          await createFileMutation.mutateAsync({
            employeeId: parseInt(selectedEmployee),
            filename: file.name,
            fileKey,
            fileUrl,
            mimeType: file.type,
            fileSize: file.size,
            uploadDate: new Date(),
            extractedText,
          });

          successCount++;
        } catch (error) {
          console.error(`Upload error for ${file.name}:`, error);
          failCount++;
        }

        // Update progress
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      // Show result
      if (successCount > 0) {
        toast.success(`成功上傳 ${successCount} 個檔案`);
        utils.files.list.invalidate();
      }
      if (failCount > 0) {
        toast.error(`${failCount} 個檔案上傳失敗`);
      }

      // Reset form
      setOpen(false);
      setFiles([]);
      setSelectedEmployee("");
      setUploadProgress(0);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  const getTotalSize = () => {
    return files.reduce((acc, file) => acc + file.size, 0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          上傳檔案
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>上傳考核問答檔案</DialogTitle>
          <DialogDescription>
            請選擇人員並上傳 PDF 或 DOCX 檔案（最多 {MAX_FILES} 個）
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>選擇人員</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="選擇人員" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} -{" "}
                    {departments?.find((d) => d.id === emp.departmentId)?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>選擇檔案</Label>
            <input
              type="file"
              accept=".pdf,.docx"
              multiple
              onChange={handleFileChange}
              disabled={files.length >= MAX_FILES}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {files.length >= MAX_FILES && (
              <p className="text-sm text-orange-600 mt-1">
                已達到最大檔案數量限制
              </p>
            )}
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              <Label>已選擇的檔案 ({files.length}/{MAX_FILES})</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
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
              <p className="text-sm text-muted-foreground">
                總大小: {(getTotalSize() / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          {uploading && (
            <div className="space-y-2">
              <Label>上傳進度</Label>
              <Progress value={uploadProgress} />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0 || !selectedEmployee}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                上傳中...
              </>
            ) : (
              `確認上傳 (${files.length} 個檔案)`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

