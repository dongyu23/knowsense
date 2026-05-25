import { Outlet, Link, useNavigate, useLocation } from "react-router";
import { BookOpen, MessageSquare, LogOut, Settings, Bell, LayoutTemplate, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Lock root scroll position — prevents scroll chaining from ChatPage's scrollIntoView
  useEffect(() => {
    const root = document.querySelector('.flex.h-screen');
    if (root) root.scrollTop = 0;
  }, [location.pathname]);
  
  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    navigate("/auth");
  };

  const navItems = [
    { name: "说明书库", path: "/", icon: BookOpen },
    { name: "智能对话", path: "/chat", icon: MessageSquare },
  ];

  const SidebarContent = () => (
    <>
      <div className="p-6 flex items-center h-[88px] overflow-hidden shrink-0">
        <Link to="/showcase" className="text-2xl font-serif font-bold flex items-center min-w-max no-underline">
          <span className="text-primary mr-2" style={{ textShadow: '0 0 20px rgba(196,155,76,0.4), 0 0 60px rgba(196,155,76,0.15), 0 0 100px rgba(196,155,76,0.08)' }}>瞬知</span>
          <span className={`text-foreground/80 text-sm font-sans mt-1 transition-all duration-300 overflow-hidden ${isDesktopCollapsed ? 'max-w-0 opacity-0' : 'max-w-[100px] opacity-100'}`}>
            KnowSense
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              title={isDesktopCollapsed ? item.name : undefined}
              className={`flex items-center py-3 px-4 rounded-xl transition-all duration-300 whitespace-nowrap overflow-hidden ${
                isActive 
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(196,155,76,0.15)]" 
                  : "text-foreground/70 hover:bg-white/5 hover:text-foreground border border-transparent"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className={`font-medium transition-all duration-300 overflow-hidden ${isDesktopCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-3'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border mt-auto overflow-x-hidden">
        <Link 
          to="/settings"
          title={isDesktopCollapsed ? "设置" : undefined}
          className={`flex items-center py-3 px-4 text-foreground/70 hover:bg-white/5 rounded-xl cursor-pointer transition-all duration-300 mb-2 whitespace-nowrap overflow-hidden border ${location.pathname.startsWith('/settings') ? "bg-primary/20 text-primary border-primary/30" : "border-transparent"}`}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className={`font-medium transition-all duration-300 overflow-hidden ${isDesktopCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-3'}`}>
            设置
          </span>
        </Link>
        <button 
          onClick={handleLogout}
          title={isDesktopCollapsed ? "退出登录" : undefined}
          className="w-full flex items-center py-3 px-4 text-destructive/80 hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all duration-300 whitespace-nowrap overflow-hidden"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`font-medium transition-all duration-300 overflow-hidden text-left ${isDesktopCollapsed ? 'max-w-0 opacity-0 ml-0' : 'max-w-[150px] opacity-100 ml-3'}`}>
            退出登录
          </span>
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative overscroll-contain">
      {/* Decorative background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex h-full border-r border-border glass flex-col z-20 relative transition-[width] duration-300 ease-in-out ${isDesktopCollapsed ? 'w-20' : 'w-64'}`}
      >
        <SidebarContent />
        <button 
          onClick={() => setIsDesktopCollapsed(!isDesktopCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-secondary border border-border rounded-full flex items-center justify-center text-foreground hover:text-primary transition-colors"
        >
          {isDesktopCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-64 border-r border-border glass flex flex-col z-50 md:hidden bg-background"
            >
              <button 
                onClick={() => setIsMobileOpen(false)}
                className="absolute top-6 right-4 p-2 text-foreground/70 hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative z-10 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 border-b border-border/50 bg-background/80 backdrop-blur-xl relative z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-2 -ml-2 text-foreground/70 hover:text-foreground"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="text-sm text-foreground/50 hidden sm:block">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-white/10 transition-colors text-foreground/70 hover:text-foreground relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full glow-accent"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-border/50">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary font-serif font-bold">
                U
              </div>
              <span className="text-sm font-medium hidden sm:block">User</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
