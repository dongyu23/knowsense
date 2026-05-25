import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, Upload, FileImage, Trash2, CheckCircle2, Loader2, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import { manualApi } from "../../api/manual";
import { manualApi } from "../../api/manual";

export function ManualDetailPage() {
  const { id } = useParams<{ id: string }>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [manual, setManual] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<any>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [m, p] = await Promise.all([manualApi.detail(id), manualApi.listPages(id)]);
      setManual(m);
      setPages(p || []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // SSE progress
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    const es = new EventSource(`/api/v1/manuals/${id}/progress?token=${encodeURIComponent(token)}`);
    es.addEventListener("progress", (e: any) => {
      try {
        const data = JSON.parse(e.data);
        setProgress(data);
        if (data.tasks?.some((t: any) => t.status === "done" || t.status === "failed")) {
          manualApi.listPages(id).then(setPages);
        }
      } catch { /* */ }
    });
    return () => es.close();
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !id) return;
    setUploading(true);
    try {
      const data = await manualApi.uploadPages(id, files);
      setPages((prev) => [...prev, ...(data || [])]);
      toast.success(`成功上传 ${files.length} 张照片`);
      loadData();
    } catch { toast.error("上传失败"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  const handleDeletePage = async (pageId: string) => {
    if (!confirm("确定要删除这一页吗？相关数据也将被删除。")) return
    try {
      await manualApi.removePage(id!, pageId)
      toast.success("已删除")
      setPages((prev) => prev.filter((p) => p.id !== pageId))
      loadData()
    } catch { toast.error("删除失败") }
  };

  const pendingCount = pages.filter((p: any) => p.ocr_status !== "done").length;
  const hasRunning = progress?.tasks?.some((t: any) =>
    t.status === "ocr_running" || t.status === "embedding" || t.status === "storing"
  );

  const statusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case "failed": return <AlertCircle className="w-3 h-3 text-destructive" />;
      default: return <Loader2 className="w-3 h-3 text-accent animate-spin" />;
    }
  };
  const statusText = (status: string) => {
    const map: Record<string, string> = { done: "已处理", failed: "失败", processing: "处理中", ocr_running: "OCR中", embedding: "向量化中", storing: "写入中" };
    return map[status] || "待处理";
  };

  if (loading) {
    return <div className="p-8 h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <Link to="/" className="p-2 rounded-full hover:bg-white/5 transition-colors text-foreground/70"><ArrowLeft className="w-5 h-5" /></Link>
        <div>
          <h1 className="text-3xl font-serif font-bold mb-1">{manual?.product_name || "说明书详情"}</h1>
          <p className="text-foreground/60 text-sm">
            {manual?.brand && <span>{manual.brand} · </span>}
            共 {pages.length} 页 · {pendingCount > 0 ? `${pendingCount} 页处理中` : "全部完成"}
          </p>
        </div>
      </div>

      {(hasRunning || pendingCount > 0) && (
        <div className="mb-6 p-4 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-between">
          <div className="flex items-center gap-3 text-accent">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">后台正在处理中 (OCR → 向量化)...</span>
          </div>
          <div className="text-sm text-accent/80 font-mono">{pages.length - pendingCount} / {pages.length}</div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-black/20 rounded-2xl border border-white/5 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {pages.map((page: any, index: number) => (
            <motion.div key={page.id}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              onClick={() => setPreviewIndex(index)}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden glass border border-white/10 flex flex-col cursor-pointer hover:border-primary/50 hover:shadow-glow transition-all">
              <div className="flex-1 bg-white/5 flex items-center justify-center relative">
                {page.ocr_status === "done" ? (
                  <img
                    src={`/api/v1/manuals/${id}/pages/${page.id}/image?token=${localStorage.getItem('token') || ''}`}
                    alt={`第 ${page.page_number} 页`}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                ) : (
                  <FileImage className="w-12 h-12 text-foreground/20" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
                  <Eye className="w-6 h-6 text-white/0 group-hover:text-white/80 transition-all" />
                </div>
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-xs border border-white/10">
                  {statusIcon(page.ocr_status)}
                  <span className={page.ocr_status === "done" ? "text-green-400" : page.ocr_status === "failed" ? "text-destructive" : "text-accent"}>
                    {statusText(page.ocr_status)}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                  className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 backdrop-blur-md text-white/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all border border-white/10"
                  title="删除此页"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 text-center text-sm font-medium border-t border-white/5 bg-background/50">第 {page.page_number} 页</div>
            </motion.div>
          ))}

          <motion.button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="aspect-[3/4] rounded-xl border-2 border-dashed border-white/10 hover:border-primary/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-3 transition-colors text-foreground/50 hover:text-primary">
            {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <><Upload className="w-8 h-8" /><span className="font-medium">补充上传</span></>}
          </motion.button>
        </div>
      </div>
      <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} hidden />

      {previewIndex !== null && (
        <ImagePreviewModal
          pages={pages}
          currentIndex={previewIndex}
          manualId={id!}
          onClose={() => setPreviewIndex(null)}
          onIndexChange={setPreviewIndex}
        />
      )}
    </div>
  );
}
