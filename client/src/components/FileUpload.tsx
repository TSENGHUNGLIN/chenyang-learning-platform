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
  const [autoDetectNewEmployee, setAutoDetectNewEmployee] = useState(true);
  const [detectedNames, setDetectedNames] = useState<string[]>([]);

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: employees } = trpc.employees.list.useQuery();
  const createFileMutation = trpc.files.create.useMutation();
  const createTextMutation = trpc.files.createFromText.useMutation();
  const createEmployeeMutation = trpc.employees.create.useMutation();
  const utils = trpc.useUtils();

  // 根據選擇的部門篩選人員
  const filteredEmployees = selectedDepartment
    ? employees?.filter((emp) => emp.departmentId === parseInt(selectedDepartment))
    : employees;

  // 從檔案名稱提取人員姓名
  const extractNameFromFilename = (filename: string): string | null => {
    // 移除副檔名
    const nameWithoutExt = filename.replace(/\.(pdf|docx)$/i, '');
    
    // 常見的非姓名詞彙清單（擴充）
    const excludedWords = [
      'Eva', '專課程', '報價', '薪酬', '細節', '考核', '履歷',
      '初階', '中階', '進階', '高階', '資料', '文件', '報告',
      '計劃', '方案', '提案', '簡報', '細節', '說明'
    ];
    
    // 非姓名後綴詞（常接在姓名後面）
    const nameSuffixes = ['測', '測驗', '考試', '考核', '報告', '履歷', '轉正', '回饋', '評估'];
    
    // 優先匹配常見的檔名格式：
    // 1. 「姓名 + 轉正/考核」格式（例：張小明轉正考核.docx）
    const nameBeforeKeywordPattern = /([\u4e00-\u9fa5]{2,4})(?=[轉正考核報告履歷測驗回饋])/;
    let match = nameWithoutExt.match(nameBeforeKeywordPattern);
    if (match) {
      let name = match[1];
      // 移除後綴詞
      for (const suffix of nameSuffixes) {
        if (name.endsWith(suffix)) {
          name = name.slice(0, -suffix.length);
        }
      }
      if (name.length >= 2 && !excludedWords.includes(name)) {
        return name;
      }
    }
    
    // 2. 「分隔符 + 姓名 + 分隔符」格式（例：初階報價專課程 – Eva – 湯芸珠薪酬細節.pdf）
    // 匹配分隔符後的中文姓名（分隔符可以是空格、橫線、底線等）
    const nameAfterSeparatorPattern = /[\s\-_–—]+([\u4e00-\u9fa5]{2,4})(?=[\s\-_–—]|$)/g;
    const allMatches = nameWithoutExt.matchAll(nameAfterSeparatorPattern);
    const names = Array.from(allMatches)
      .map(m => {
        let name = m[1];
        // 移除後綴詞
        for (const suffix of nameSuffixes) {
          if (name.endsWith(suffix)) {
            name = name.slice(0, -suffix.length);
          }
        }
        return name;
      })
      .filter(name => name.length >= 2 && !excludedWords.includes(name));
    
    // 從所有匹配中選擇最後一個中文姓名（通常是人名）
    if (names.length > 0) {
      return names[names.length - 1];
    }
    
    // 3. 備用：匹配任何 2-4 個中文字（但排除常見詞彙和後綴詞）
    const fallbackPattern = /([\u4e00-\u9fa5]{2,4})/;
    match = nameWithoutExt.match(fallbackPattern);
    if (match) {
      let name = match[1];
      // 移除後綴詞
      for (const suffix of nameSuffixes) {
        if (name.endsWith(suffix)) {
          name = name.slice(0, -suffix.length);
        }
      }
      if (name.length >= 2 && !excludedWords.includes(name)) {
        return name;
      }
    }
    
    return null;
  };

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

      // 自動識別新人姓名
      if (autoDetectNewEmployee && selectedDepartment) {
        const names: string[] = [];
        validFiles.forEach(file => {
          const name = extractNameFromFilename(file.name);
          if (name && !names.includes(name)) {
            // 檢查是否已存在於該部門
            const existingEmployee = filteredEmployees?.find(emp => emp.name === name);
            if (!existingEmployee) {
              names.push(name);
            }
          }
        });
        if (names.length > 0) {
          setDetectedNames(names);
          toast.info(`偵測到新人姓名：${names.join('、')}`);
        }
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleFileUpload = async () => {
    if (files.length === 0) {
      toast.error("請選擇檔案");
      return;
    }

    if (!selectedDepartment) {
      toast.error("請選擇部門");
      return;
    }

    // 允許沒有人員也能上傳，之後由人工分類
    // 不再強制要求選擇人員

    setUploading(true);
    setUploadProgress(0);

    try {
      // 如果有偵測到新人姓名，先批次建立人員資料
      const createdEmployeeIds: Record<string, string> = {};
      if (autoDetectNewEmployee && detectedNames.length > 0) {
        for (const name of detectedNames) {
          try {
            const newEmployee = await createEmployeeMutation.mutateAsync({
              name,
              departmentId: parseInt(selectedDepartment),
            });
            createdEmployeeIds[name] = newEmployee.id.toString();
            toast.success(`已自動新增人員：${name}`);
          } catch (error) {
            toast.error(`新增人員 ${name} 失敗`);
          }
        }
        await utils.employees.list.invalidate();
      }

      const totalFiles = files.length;
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 決定使用哪個員工ID
        let employeeId = selectedEmployee;
        
        // 如果啟用自動識別，嘗試從檔案名稱匹配員工
        if (autoDetectNewEmployee) {
          const detectedName = extractNameFromFilename(file.name);
          if (detectedName) {
            // 優先使用新建立的員工
            if (createdEmployeeIds[detectedName]) {
              employeeId = createdEmployeeIds[detectedName];
            } else {
              // 否則查找現有員工
              const existingEmployee = filteredEmployees?.find(emp => emp.name === detectedName);
              if (existingEmployee) {
                employeeId = existingEmployee.id.toString();
              }
            }
          }
        }

        // 如果沒有employeeId，也允許上傳（設為null，由人工分類）

        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const uploadResult = await response.json();
            // 儲存檔案metadata到資料庫
            await createFileMutation.mutateAsync({
              employeeId: employeeId ? parseInt(employeeId) : null,
              filename: uploadResult.filename,
              fileUrl: uploadResult.fileUrl,
              fileKey: uploadResult.fileKey,
              mimeType: uploadResult.mimeType,
              fileSize: uploadResult.fileSize,
              uploadDate: new Date(),
              extractedText: uploadResult.extractedText || "",
            });
            successCount++;
          } else {
            failCount++;
            toast.error(`${file.name} 上傳失敗`);
          }
        } catch (error) {
          failCount++;
          toast.error(`${file.name} 上傳失敗`);
          console.error(`Upload error for ${file.name}:`, error);
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      if (successCount > 0) {
        toast.success(`成功上傳 ${successCount} 個檔案`);
        await utils.files.list.invalidate();
        setFiles([]);
        setSelectedDepartment("");
        setSelectedEmployee("");
        setDetectedNames([]);
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
            <Label htmlFor="employee">人員（選填）</Label>
            <Select
              value={selectedEmployee}
              onValueChange={setSelectedEmployee}
              disabled={!selectedDepartment}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedDepartment ? "選擇人員或留空自動識別" : "請先選擇部門"} />
              </SelectTrigger>
              <SelectContent>
                {filteredEmployees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              💡 提示：如果檔案名稱包含人員姓名（例如：蔣昀眞轉正考核.docx），系統會自動識別並建立新人員資料
            </p>
          </div>

          {/* 偵測到的新人姓名 */}
          {detectedNames.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm font-medium text-blue-900 mb-1">✨ 偵測到新人姓名</p>
              <p className="text-sm text-blue-700">
                系統將自動新增以下人員到 {departments?.find(d => d.id.toString() === selectedDepartment)?.name}：
                <span className="font-medium ml-1">{detectedNames.join('、')}</span>
              </p>
            </div>
          )}

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
            <Button onClick={handleUpload} disabled={uploading || (!selectedEmployee && detectedNames.length === 0)}>
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

