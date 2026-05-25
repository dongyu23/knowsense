import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { Plus, Search, FileText, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { manualApi } from "../../api/manual";

export function ManualsPage() {
  const [manuals, setManuals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadManuals = useCallback(async () => {
    try {
      const data = await manualApi.list();
      setManuals(data.list || []);
    } catch { /* api client handles error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadManuals(); }, [loadManuals]);

  const filtered = manuals.filter((m: any) =>
    m.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm("确定要删除这份说明书吗？")) return;
    try {
      await manualApi.remove(id);
      setManuals((prev) => prev.filter((m: any) => m.id !== id));
      toast.success("说明书已删除");
    } catch { /* */ }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const data = await manualApi.create({
        product_name: form.get("product_name") as string,
        brand: (form.get("brand") as string) || undefined,
        model: (form.get("model") as string) || undefined,
        category: (form.get("category") as string) || undefined,
      });
      setManuals((prev) => [data, ...prev]);
      toast.success("创建成功");
      setIsCreateOpen(false);
    } catch { /* */ }
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = { done: "已完成", processing: "处理中", failed: "失败" };
    return map[s] || "待处理";
  };

  if (loading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">说明书库</h1>
          <p className="text-foreground/60">管理您的所有设备说明书</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
            <input type="text" placeholder="搜索产品..." value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-primary/50 w-64 transition-colors" />
          </div>
          <button onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" />新建分组
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-8">
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((m: any, i: number) => (
              <motion.div key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}>
                <Link to={`/manuals/${m.id}`} className="block group">
                  <div className="glass rounded-xl p-5 border border-white/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex gap-2">
                        {m.status !== 'done' && (
                          <span className="px-2 py-1 text-xs rounded-full bg-accent/20 text-accent border border-accent/20">
                            {statusLabel(m.status)}
                          </span>
                        )}
                        <button onClick={(e) => handleDelete(m.id, e)}
                          className="p-1.5 text-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold mb-1 truncate group-hover:text-primary transition-colors">{m.product_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-foreground/50 mb-4">
                      {m.brand && <span>{m.brand}</span>}
                      {m.brand && m.category && <span>•</span>}
                      {m.category && <span>{m.category}</span>}
                    </div>
                    <div className="flex items-center justify-between text-xs text-foreground/40 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />{m.total_pages} 页
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(m.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-foreground/40">
            <FileText className="w-16 h-16 mb-4 opacity-50" />
            <p>{search ? "没有找到匹配的说明书" : "还没有说明书，点击「新建分组」开始"}</p>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass rounded-2xl border border-white/10 p-6 shadow-2xl">
            <h2 className="text-2xl font-serif font-bold mb-6">新建说明书分组</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">产品名称 *</label>
                <input required name="product_name" type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-primary/50" placeholder="如：Sony WH-1000XM5" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">品牌 (可选)</label>
                  <input name="brand" type="text" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-primary/50" placeholder="如：Sony" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">型号 (可选)</label>
                  <input name="model" type="text" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-primary/50" placeholder="如：WH-1000XM5" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">品类 (可选)</label>
                <input name="category" type="text" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-foreground focus:outline-none focus:border-primary/50" placeholder="如：耳机" />
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-white/10">
                <button type="button" onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-foreground/70 hover:bg-white/5 transition-colors">取消</button>
                <button type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-background font-medium rounded-lg transition-colors">确认创建</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
