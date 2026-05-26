import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Bot, User, Plus, MessageSquare, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { chatApi } from "../../api/chat";

export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [convs, setConvs] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const skipLoadRef = useRef(false);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });

  const loadConvs = useCallback(async () => {
    try { const data = await chatApi.list(); setConvs(data.list || []); } catch { /* */ }
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try { const data = await chatApi.messages(convId); setMessages((data.list || []).reverse()); } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConvs(); }, [loadConvs]);

  useEffect(() => {
    if (id) {
      if (skipLoadRef.current) {
        skipLoadRef.current = false;
        setLoading(false);
        return;
      }
      setLoading(true);
      loadMessages(id);
    } else {
      setMessages([]);
      setLoading(false);
    }
  }, [id, loadMessages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;
    const content = input.trim();
    setIsTyping(true);

    let convId = id;
    if (!convId) {
      try {
        const newConv = await chatApi.create(content.slice(0, 20));
        convId = newConv.id;
        skipLoadRef.current = true;
        navigate(`/chat/${convId}`);
        loadConvs();
      } catch {
        setIsTyping(false);
        toast.error("创建对话失败");
        return;
      }
    }
    setInput("");

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content }]);

    const aiMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMsgId, role: "assistant", content: "", citations: [] }]);

    const token = localStorage.getItem("token");
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const resp = await fetch(`/api/v1/conversations/${convId}/messages?message=${encodeURIComponent(content)}`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
        signal: abort.signal,
      });
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) { buffer += decoder.decode(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const chunk = JSON.parse(line.slice(6));
              const text = typeof chunk === "string" ? chunk : chunk.content || chunk.data || "";
              if (text) {
                setMessages((prev) => {
                  const copy = [...prev];
                  for (let i = copy.length - 1; i >= 0; i--) {
                    if (copy[i].role === "assistant") {
                      copy[i] = { ...copy[i], content: copy[i].content + text };
                      break;
                    }
                  }
                  return copy;
                });
              }
            } catch { /* */ }
          }
        }
      }
      // Flush remaining buffer after stream end
      if (buffer && buffer.startsWith("data: ")) {
        try {
          const chunk = JSON.parse(buffer.slice(6));
          const text = typeof chunk === "string" ? chunk : chunk.content || chunk.data || "";
          if (text) {
            setMessages((prev) => {
              const copy = [...prev];
              for (let i = copy.length - 1; i >= 0; i--) {
                if (copy[i].role === "assistant") {
                  copy[i] = { ...copy[i], content: copy[i].content + text };
                  break;
                }
              }
              return copy;
            });
          }
        } catch { /* */ }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === "assistant") {
            copy[i] = { ...copy[i], content: "[网络错误，请重试]" };
            break;
          }
        }
        return copy;
      });
    }

    // Fetch citations
    if (convId) {
      try {
        const data = await chatApi.messages(convId, 2);
        const latest = (data.list || []).reverse().find((m: any) => m.role === "assistant");
        if (latest?.citations?.length) {
          setMessages((prev) => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i].role === "assistant") {
                copy[i] = { ...copy[i], citations: latest.citations };
                break;
              }
            }
            return copy;
          });
        }
      } catch { /* */ }
    }

    setIsTyping(false);
    loadConvs();
  };

  const handleDeleteConv = async (convId: string) => {
    if (!confirm("确定要删除这条对话记录吗？")) return
    try {
      await chatApi.remove(convId)
      toast.success("已删除")
      if (id === convId) navigate("/chat")
      loadConvs()
    } catch { toast.error("删除失败") }
  }

  const showWelcome = !id && messages.length === 0 && !loading;

  return (
    <div className="flex h-full overflow-hidden">
      <div className="hidden md:flex w-72 border-r border-border/50 bg-black/20 flex-col shrink-0">
        <div className="p-4 shrink-0">
          <button onClick={() => { navigate("/chat"); setMessages([]); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-xl transition-colors font-medium">
            <Plus className="w-5 h-5" />新建对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4">
          <div className="text-xs font-medium text-foreground/40 px-2 pt-2 pb-1">最近对话</div>
          {convs.map((c) => (
            <div key={c.id} className="group flex items-center">
              <button onClick={() => navigate(`/chat/${c.id}`)}
                className={`flex-1 flex items-start gap-3 px-3 py-3 rounded-lg text-left transition-colors ${id === c.id ? "bg-white/10 text-foreground" : "text-foreground/70 hover:bg-white/5 hover:text-foreground"}`}>
                <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 opacity-70" />
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium">{c.title || "新对话"}</div>
                  <div className="text-[10px] text-foreground/40 mt-1">{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteConv(c.id); }}
                className="p-1.5 rounded-md text-white/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                title="删除对话"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-gradient-to-b from-background to-black/40 min-w-0">
        <div className="flex-1 overflow-y-auto px-4 md:px-8 min-h-0 relative">
          {showWelcome && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 glow-accent">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-3xl font-serif font-bold mb-4">你好，我是瞬知助手</h2>
              <p className="text-foreground/60 max-w-md text-sm leading-relaxed">
                我可以帮您解答任何已上传说明书中的问题。请在下方输入您的问题。
              </p>
            </div>
          )}

          {loading && !showWelcome && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {!loading && messages.length > 0 && (
            <>
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div key={msg.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-4 max-w-4xl mx-auto ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "assistant" ? "bg-primary/20 text-primary border border-primary/30 glow-accent" : "bg-white/10 text-foreground border border-white/20"}`}>
                      {msg.role === "assistant" ? <Bot className="w-6 h-6" /> : <User className="w-6 h-6" />}
                    </div>
                    <div className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-6 py-4 rounded-2xl max-w-[85%] ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm" : "glass rounded-tl-sm border-white/10"}`}>
                        {msg.role === "user" ? (
                          <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                          <div className="markdown-content text-[15px] leading-relaxed break-words space-y-4 [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&_pre]:bg-black/50 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_code]:font-mono [&_code]:text-sm [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {(msg.citations?.length > 0) && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {msg.citations.map((cite: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 text-accent text-xs rounded-full">
                              <BookOpen className="w-3 h-3" />
                              {cite.product_name || cite.doc}{cite.page_number ? ` · 第${cite.page_number}页` : cite.page ? ` · 第${cite.page}页` : ""}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {isTyping && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 max-w-4xl mx-auto">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/30 glow-accent flex items-center justify-center mt-1"><Bot className="w-6 h-6" /></div>
                  <div className="glass rounded-2xl rounded-tl-sm px-6 py-4 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.15s" }} />
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.3s" }} />
                  </div>
                </motion.div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 p-4 md:p-6 pt-2 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSend} className="relative group">
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="询问关于说明书的任何问题..."
                className="w-full pl-6 pr-16 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-foreground placeholder-foreground/30 shadow-lg backdrop-blur-md" />
              <button type="submit" disabled={!input.trim() || isTyping}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-primary text-background rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                <Send className="w-5 h-5" />
              </button>
            </form>
            <div className="text-center text-xs text-foreground/40 mt-3">内容由 AI 生成，仅供参考，请以实际产品说明书为准。</div>
          </div>
        </div>
      </div>
    </div>
  );
}
