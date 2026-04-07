import { Moon, Droplet, Dumbbell, Utensils, Timer, TrendingUp, Scale, Ruler, Clock } from 'lucide-react';

export default function RightPanel() {
  return (
    <div className="flex flex-col gap-6">
      {/* User Stats Grid */}
      <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-primary grid grid-cols-3">
        <div className="text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center mb-2 text-text-secondary">
            <Scale className="w-4 h-4" />
          </div>
          <span className="block text-lg font-bold text-[#a3e635]">60 kg</span>
          <span className="text-[10px] text-text-tertiary">Weight</span>
        </div>

        <div className="text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center mb-2 text-text-secondary">
            <Ruler className="w-4 h-4" />
          </div>
          <span className="block text-lg font-bold text-[#a3e635]">170 cm</span>
          <span className="text-[10px] text-text-tertiary">Height</span>
        </div>

        <div className="text-center flex flex-col items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-bg-tertiary flex items-center justify-center mb-2 text-text-secondary">
            <Clock className="w-4 h-4" />
          </div>
          <span className="block text-lg font-bold text-[#a3e635]">25 yrs</span>
          <span className="text-[10px] text-text-tertiary">Age</span>
        </div>
      </div>

      {/* Calorie Chart */}
      <div className="bg-bg-secondary rounded-2xl p-4 md:p-6 border border-border-primary">
        <div className="flex justify-between items-center mb-4">
          <div className="text-center">
            <span className="block text-lg font-bold text-text-primary">350 kcal</span>
            <span className="text-[10px] text-text-tertiary">Consumed</span>
          </div>
          
          {/* Custom SVG Donut Chart */}
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="var(--bg-tertiary)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#a3e635"
                strokeWidth="3"
                strokeDasharray="20, 100"
                className="animate-pulse"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-text-primary">350</span>
              <span className="text-[8px] text-text-tertiary">kcal</span>
            </div>
          </div>

          <div className="text-center">
            <span className="block text-lg font-bold text-text-primary">1650 kcal</span>
            <span className="text-[10px] text-text-tertiary">Remaining</span>
          </div>
        </div>

        <div className="flex justify-between mt-6 px-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#a3e635]"></div>
            <span className="text-[10px] text-text-secondary">P - 10/12g</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-[10px] text-text-secondary">C - 10/12g</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#ff5e00]"></div>
            <span className="text-[10px] text-text-secondary">F - 10/12g</span>
          </div>
        </div>
      </div>

      {/* Sleep & Water */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-bg-secondary rounded-2xl p-4 border border-border-primary flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-3 w-full">
            <Moon className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-text-secondary">Sleep</span>
          </div>
          <div className="relative w-16 h-16 mb-2">
             <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#a855f7" strokeWidth="4" strokeDasharray="60, 100" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-text-primary">5/8</span>
            </div>
          </div>
          <span className="text-[10px] text-text-tertiary">Hours</span>
        </div>

        <div className="bg-bg-secondary rounded-2xl p-4 border border-border-primary flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 mb-3 w-full">
            <Droplet className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-medium text-text-secondary">Water</span>
          </div>
          <div className="relative w-16 h-16 mb-2">
             <svg viewBox="0 0 36 36" className="w-full h-full">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="4" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-text-primary">0/5</span>
            </div>
          </div>
          <span className="text-[10px] text-text-tertiary">Liters</span>
        </div>
      </div>

      {/* Today Plan */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-text-primary mb-4">Today Plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
          {[
            { title: 'Push Up', desc: '100 Push up a day', progress: 45, img: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?q=80&w=100&auto=format&fit=crop' },
            { title: 'Sit Up', desc: '20 Sit up a day', progress: 75, img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=100&auto=format&fit=crop' },
            { title: 'Knee Push Up', desc: '20 Sit up a day', progress: 45, img: 'https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?q=80&w=100&auto=format&fit=crop' },
            { title: 'Belly Fat Burner', desc: '20 Sit up a day', progress: 60, img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=100&auto=format&fit=crop' },
          ].map((plan, i) => (
            <div key={i} className="bg-bg-secondary rounded-xl p-3 border border-border-primary flex items-center gap-3">
              <img src={plan.img} alt={plan.title} className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-text-primary">{plan.title}</h4>
                <p className="text-[10px] text-text-tertiary">{plan.desc}</p>
                <div className="mt-2 h-1 w-full bg-bg-tertiary rounded-full overflow-hidden">
                  <div className="h-full bg-[#a3e635]" style={{ width: `${plan.progress}%` }}></div>
                </div>
              </div>
              <span className="text-xs font-bold text-[#a3e635]">{plan.progress}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3">
          <button className="bg-bg-secondary border border-border-primary hover:border-[#a3e635] rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors">
            <Dumbbell className="w-5 h-5 text-[#a3e635]" />
            <span className="text-xs font-medium text-text-secondary">Log Exercise</span>
          </button>
          <button className="bg-bg-secondary border border-border-primary hover:border-[#ff5e00] rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors">
            <Utensils className="w-5 h-5 text-[#ff5e00]" />
            <span className="text-xs font-medium text-text-secondary">Log Meal</span>
          </button>
          <button className="bg-bg-secondary border border-border-primary hover:border-blue-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors">
            <Timer className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-medium text-text-secondary">Timer</span>
          </button>
          <button className="bg-bg-secondary border border-border-primary hover:border-purple-400 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-medium text-text-secondary">Progress</span>
          </button>
        </div>
      </div>
    </div>
  );
}
