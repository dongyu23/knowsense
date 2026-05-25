import { useState } from "react";
import { User, Bell, Shield, Paintbrush, Moon, Globe, ChevronRight } from "lucide-react";

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  const tabs = [
    { id: "profile", name: "个人信息", icon: User },
    { id: "notifications", name: "通知设置", icon: Bell },
    { id: "security", name: "安全隐私", icon: Shield },
    { id: "appearance", name: "外观偏好", icon: Paintbrush },
  ];

  return (
    <div className="h-full flex flex-col p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8 shrink-0">
        <h1 className="text-3xl font-serif text-foreground">
          系统<span className="text-primary">设置</span>
        </h1>
        <p className="text-foreground/60 mt-2">管理您的账户偏好和系统配置</p>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border border-primary/20 glow-accent"
                  : "text-foreground/70 hover:bg-white/5 hover:text-foreground border border-transparent"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-medium flex-1 text-left">{tab.name}</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${activeTab === tab.id ? 'translate-x-1' : 'opacity-0'}`} />
            </button>
          ))}
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-black/20 rounded-2xl border border-border/50 p-6 md:p-8 overflow-y-auto min-h-0 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
          
          {activeTab === "profile" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-serif text-3xl font-bold relative">
                  U
                  <button className="absolute bottom-0 right-0 w-8 h-8 bg-secondary rounded-full border border-border flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors">
                    <Paintbrush className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <h3 className="text-xl font-medium">User</h3>
                  <p className="text-foreground/60">user@example.com</p>
                </div>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">显示昵称</label>
                  <input 
                    type="text" 
                    defaultValue="User"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">个人签名</label>
                  <textarea 
                    rows={3}
                    defaultValue="保持对知识的渴望。"
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all resize-none"
                  />
                </div>
                <button className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-6 py-2.5 rounded-xl font-medium transition-colors">
                  保存更改
                </button>
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
              <h3 className="text-xl font-medium mb-6">界面偏好</h3>
              
              <div className="space-y-6 max-w-2xl">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">深色模式</h4>
                      <p className="text-sm text-foreground/60">目前系统强制开启深色模式</p>
                    </div>
                  </div>
                  <div className="w-12 h-6 bg-primary/30 rounded-full relative cursor-not-allowed opacity-80">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-primary rounded-full" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">语言设置</h4>
                      <p className="text-sm text-foreground/60">选择应用的显示语言</p>
                    </div>
                  </div>
                  <select className="bg-background border border-border rounded-lg px-3 py-1.5 outline-none focus:border-primary/50">
                    <option value="zh">简体中文</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {(activeTab === "notifications" || activeTab === "security") && (
            <div className="h-full flex flex-col items-center justify-center text-foreground/40 animate-in fade-in duration-500">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 opacity-50" />
              </div>
              <p>该功能正在开发中</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}