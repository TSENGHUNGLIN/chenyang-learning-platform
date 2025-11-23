import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, ZoomIn, ZoomOut, RotateCw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: {
    filename: string;
    fileUrl: string;
    fileSize?: number;
    extractedText?: string;
  } | null;
}

export default function FilePreviewDialog({
  open,
  onOpenChange,
  file,
}: FilePreviewDialogProps) {
  const [imageZoom, setImageZoom] = useState(100);
  const [imageRotation, setImageRotation] = useState(0);

  if (!file) return null;

  const fileExtension = file.filename.toLowerCase().split('.').pop() || '';
  const isPDF = fileExtension === 'pdf';
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExtension);
  const isDocument = ['docx', 'doc', 'txt'].includes(fileExtension);
  const isCSV = fileExtension === 'csv';

  // 重置圖片狀態
  const resetImageState = () => {
    setImageZoom(100);
    setImageRotation(0);
  };

  // 下載檔案
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = file.fileUrl;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("開始下載檔案");
  };

  // 在新視窗開啟
  const handleOpenInNewTab = () => {
    window.open(file.fileUrl, '_blank');
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          resetImageState();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate flex-1">{file.filename}</span>
            <div className="flex items-center gap-2 ml-4">
              <Button onClick={handleDownload} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                下載
              </Button>
              <Button onClick={handleOpenInNewTab} size="sm" variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                新視窗開啟
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            檔案大小：{file.fileSize ? (file.fileSize / 1024).toFixed(2) : '未知'} KB
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* PDF 預覽 */}
          {isPDF && (
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <iframe
                src={file.fileUrl}
                className="w-full h-[600px]"
                title={file.filename}
              />
            </div>
          )}

          {/* 圖片預覽 */}
          {isImage && (
            <div className="space-y-4">
              {/* 圖片控制按鈕 */}
              <div className="flex items-center justify-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageZoom(Math.max(25, imageZoom - 25))}
                  disabled={imageZoom <= 25}
                >
                  <ZoomOut className="w-4 h-4 mr-2" />
                  縮小
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                  {imageZoom}%
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageZoom(Math.min(200, imageZoom + 25))}
                  disabled={imageZoom >= 200}
                >
                  <ZoomIn className="w-4 h-4 mr-2" />
                  放大
                </Button>
                <div className="w-px h-6 bg-border mx-2" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImageRotation((imageRotation + 90) % 360)}
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  旋轉
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetImageState}
                >
                  重置
                </Button>
              </div>

              {/* 圖片顯示 */}
              <div className="flex items-center justify-center border rounded-lg overflow-hidden bg-muted/30 p-8">
                <img
                  src={file.fileUrl}
                  alt={file.filename}
                  style={{
                    transform: `scale(${imageZoom / 100}) rotate(${imageRotation}deg)`,
                    transition: 'transform 0.3s ease',
                    maxWidth: '100%',
                    maxHeight: '600px',
                  }}
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* 文件預覽 (DOCX/DOC/TXT) */}
          {isDocument && (
            <div className="border rounded-lg p-6 bg-muted/30">
              {file.extractedText ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {file.extractedText}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    無法預覽此文件內容
                  </p>
                  <Button onClick={handleOpenInNewTab} variant="outline">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    在新視窗開啟
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* CSV 預覽提示 */}
          {isCSV && (
            <div className="border rounded-lg p-8 bg-muted/30 text-center">
              <p className="text-muted-foreground mb-4">
                CSV 檔案請使用專用的 CSV 預覽功能
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                點擊檔案列表中的「CSV 預覽」按鈕可查看表格格式的資料
              </p>
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                下載 CSV 檔案
              </Button>
            </div>
          )}

          {/* 不支援的檔案類型 */}
          {!isPDF && !isImage && !isDocument && !isCSV && (
            <div className="border rounded-lg p-8 bg-muted/30 text-center">
              <p className="text-muted-foreground mb-4">
                此檔案類型不支援預覽
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                支援的格式：PDF、圖片（JPG/PNG/GIF）、文件（DOCX/DOC/TXT）
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button onClick={handleDownload} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  下載檔案
                </Button>
                <Button onClick={handleOpenInNewTab} variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  在新視窗開啟
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

