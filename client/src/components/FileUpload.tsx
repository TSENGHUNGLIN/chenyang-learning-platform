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
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FileUpload() {
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const createFileMutation = trpc.files.create.useMutation();
  const utils = trpc.useUtils();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedTypes.includes(selectedFile.type)) {
        toast.error("僅支援 PDF 或 DOCX 檔案");
        return;
      }
      setFile(selectedFile);
    }
  };



  const handleUpload = async () => {
    if (!file || !selectedEmployee) {
      toast.error("請選擇檔案和人員");
      return;
    }

    setUploading(true);
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

      toast.success("檔案上傳成功");
      utils.files.list.invalidate();
      setOpen(false);
      setFile(null);
      setSelectedEmployee("");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("上傳失敗");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          上傳檔案
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上傳考核問答檔案</DialogTitle>
          <DialogDescription>請選擇人員並上傳 PDF 或 DOCX 檔案</DialogDescription>
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
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {file && (
              <p className="text-sm text-muted-foreground mt-2">
                已選擇: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                上傳中...
              </>
            ) : (
              "確認上傳"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

