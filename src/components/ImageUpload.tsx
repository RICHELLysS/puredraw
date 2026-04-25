import React, { useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { compressImage } from "@/lib/utils";
import { Upload, X, ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/db/supabase";

interface ImageUploadProps {
  onUploadSuccess: (url: string) => void;
  folder?: string;
  bucketName?: string;
  maxSizeMB?: number;
  label?: string;
  aspectRatio?: "square" | "video" | "auto";
  className?: string;
}

export function ImageUpload({
  onUploadSuccess,
  folder = "general",
  bucketName = "puredraw_images",
  maxSizeMB = 1,
  label,  // default handled via t() inside component
  aspectRatio = "auto",
  className = "",
}: ImageUploadProps) {
  const { t } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 格式校验
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error(t("imageUpload.unsupported"));
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    
    // 如果文件超过限制，提示将进行压缩
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      setCompressionStatus(t("imageUpload.compressing"));
    } else {
      setCompressionStatus(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(10);
    try {
      // 1. 压缩图片
      const maxSizeInBytes = maxSizeMB * 1024 * 1024;
      let fileToUpload = file;
      
      if (file.size > maxSizeInBytes) {
        setCompressionStatus(t("imageUpload.inProgress"));
        fileToUpload = await compressImage(file, maxSizeInBytes);
        const finalSizeMB = (fileToUpload.size / (1024 * 1024)).toFixed(2);
        setCompressionStatus(`${t("imageUpload.compressed")}: ${finalSizeMB}MB`);
        toast.info(`${t("imageUpload.compressedToast")} ${finalSizeMB}MB`);
      }
      
      setProgress(30);

      // 2. 上传到 Supabase Storage
      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // 使用原生 supabase client 上传以获取进度（由于 SDK 本身不直接支持进度回调，我们模拟一个）
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;
      
      setProgress(80);

      // 3. 获取公开链接
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      setProgress(100);
      toast.success(t("imageUpload.success"));
      onUploadSuccess(publicUrl);
      
      // 重置状态
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 500);

    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(t("imageUpload.failed") + ": " + err.message);
      setIsUploading(false);
      setProgress(0);
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    setProgress(0);
    setCompressionStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "h-40 w-full",
  }[aspectRatio];

  return (
    <div className={`space-y-4 ${className}`}>
      {!preview ? (
        <label className={`flex flex-col items-center justify-center border-2 border-dashed border-primary/30 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all p-6 ${aspectRatioClass}`}>
          <div className="flex flex-col items-center text-center">
            <Upload className="w-8 h-8 text-primary mb-2" />
            <p className="font-bold text-sm">{label ?? t("imageUpload.label")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("imageUpload.hint")}</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      ) : (
        <div className="relative group">
          <div className={`rounded-2xl overflow-hidden border-2 border-primary/20 ${aspectRatioClass}`}>
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          </div>
          
          {!isUploading && (
            <button
              onClick={removeFile}
              className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-4">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm font-bold">{t("imageUpload.uploading")}</p>
              <Progress value={progress} className="w-3/4 h-2 mt-2 bg-white/20" />
            </div>
          )}
        </div>
      )}

      {compressionStatus && !isUploading && (
        <div className="flex items-center gap-2 text-[10px] text-primary/80 bg-primary/5 p-2 rounded-lg border border-primary/10">
          <AlertCircle className="w-3 h-3" />
          {compressionStatus}
        </div>
      )}

      {preview && !isUploading && (
        <Button 
          onClick={handleUpload} 
          className="w-full h-10 cat-button font-bold"
        >
          {t("imageUpload.confirm")}
        </Button>
      )}
    </div>
  );
}
