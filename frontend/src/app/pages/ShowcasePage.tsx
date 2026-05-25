import { motion } from "motion/react";
import { Sparkles, Brain, Zap, Shield, ArrowDown } from "lucide-react";

import { Link, useNavigate } from "react-router";

export function ShowcasePage() {
  const navigate = useNavigate();
  const features = [
    {
      icon: Brain,
      title: "深度上下文理解",
      description: "我们的 AI 模型能够分析长篇说明书，提取核心概念，并在对话中保持精准的上下文记忆，为您提供连贯且专业的解答。"
    },
    {
      icon: Zap,
      title: "毫秒级响应",
      description: "基于优化的检索引擎与流式输出技术，问题提出即刻获得解答，大大节省您的时间，提升信息获取效率。"
    },
    {
      icon: Shield,
      title: "企业级隐私保护",
      description: "所有上传的文档与对话记录均采用端到端加密，确保您的核心业务数据和知识产权绝对安全。"
    }
  ];

  return (
    <div className="h-full overflow-y-auto relative bg-background scroll-smooth">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center flex-col px-4 md:px-8 pt-20 pb-32 overflow-hidden">
        {/* Navigation Bar for Showcase */}
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
          <Link to="/" className="text-2xl font-serif font-bold flex items-center gap-2 no-underline">
            <span className="text-primary" style={{ textShadow: '0 0 20px rgba(196,155,76,0.4), 0 0 60px rgba(196,155,76,0.15), 0 0 100px rgba(196,155,76,0.08)' }}>瞬知</span>
            <span className="text-foreground/80 text-sm font-sans mt-1">KnowSense</span>
          </Link>
          <button
            onClick={() => navigate("/")}
            className="px-5 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-medium text-sm backdrop-blur-md glass"
          >
            进入应用
          </button>
        </div>
        {/* Abstract Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-accent/10 rounded-full blur-[150px] mix-blend-screen animate-pulse" style={{ animationDuration: '6s' }} />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="text-center z-10 max-w-4xl mx-auto flex flex-col items-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary mb-8 glow-accent">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Luminous Knowledge Design</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-8 leading-tight">
            洞见隐藏于文本的<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-[shimmer_3s_linear_infinite]">
              无穷智慧
            </span>
          </h1>
          
          <p className="text-lg md:text-2xl text-foreground/60 max-w-2xl font-light leading-relaxed">
            瞬知·KnowSense 结合先进的人工智能与精美的交互设计，让枯燥的技术文档化作您得心应手的知识智库。
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/40"
        >
          <span className="text-xs uppercase tracking-widest">向下滚动</span>
          <ArrowDown className="w-5 h-5 animate-bounce" />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-4 md:px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">核心能力</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: index * 0.2 }}
                className="glass p-8 rounded-3xl border border-white/5 hover:border-primary/30 hover:shadow-[0_0_30px_rgba(196,155,76,0.1)] transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-16 h-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-serif font-bold mb-4">{feature.title}</h3>
                <p className="text-foreground/60 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Demo Section */}
      <section className="py-32 px-4 md:px-8 relative z-10 bg-black/40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex-1 space-y-8"
          >
            <h2 className="text-3xl md:text-5xl font-serif font-bold leading-tight">
              优雅的界面，<br />极致的体验。
            </h2>
            <p className="text-lg text-foreground/60">
              采用深色基调与铜色辉光，我们为您打造了一个沉浸式的阅读与对话环境。抛弃杂乱的元素，只留下纯粹的知识交互。
            </p>
            <ul className="space-y-4">
              {['毛玻璃质感带来的空间层次', '响应式的智能侧边栏设计', '如丝般顺滑的动画过渡'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-foreground/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary glow-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="flex-1 relative w-full aspect-[4/5] md:aspect-square rounded-3xl glass border border-white/10 p-4 md:p-8"
          >
            {/* Mock UI inside the demo box */}
            <div className="w-full h-full rounded-2xl bg-background border border-border/50 overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px]" />
              <div className="h-12 border-b border-border/50 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
              <div className="flex-1 p-6 space-y-6">
                <div className="w-3/4 h-8 bg-white/5 rounded-lg" />
                <div className="space-y-3">
                  <div className="w-full h-4 bg-white/5 rounded" />
                  <div className="w-full h-4 bg-white/5 rounded" />
                  <div className="w-5/6 h-4 bg-white/5 rounded" />
                </div>
                <div className="mt-8 p-4 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="w-1/3 h-5 bg-primary/40 rounded mb-4" />
                  <div className="w-full h-3 bg-primary/20 rounded mb-2" />
                  <div className="w-2/3 h-3 bg-primary/20 rounded" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer CTA */}
      <section className="py-32 px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-serif font-bold mb-8">准备好探索未知的领域了吗？</h2>
        <button 
          onClick={() => navigate("/")}
          className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-medium text-lg hover:shadow-[0_0_30px_rgba(196,155,76,0.4)] transition-all duration-300"
        >
          立即开始体验
        </button>
      </section>

      {/* Shimmer animation for text */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}} />
    </div>
  );
}