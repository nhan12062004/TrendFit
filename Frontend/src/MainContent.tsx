import { Heart, Flame, Activity, ArrowRight, Dumbbell } from 'lucide-react';

export default function MainContent() {
  return (
    <div className="flex flex-col gap-6">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-bg-secondary h-[220px] md:h-[260px] flex items-center">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" 
            alt="Workout" 
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-6 md:p-8 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 w-full">
            <div className="max-w-4xl">
              <h2 className="text-base sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-white leading-[1.1] mb-2 uppercase tracking-tighter">
                WELCOME TO <span className="text-[#a3e635]">TRENDFIT AI</span> -<br className="hidden sm:block" />
                YOUR DATA, YOUR SUCCESS.
              </h2>
              <p className="text-[9px] sm:text-xs md:text-sm text-white/80 mb-4 max-w-lg">
                Complete your profile to unlock <span className="text-[#a3e635] font-semibold">personalized plans</span>.
              </p>
              <button className="text-[#a3e635] font-bold flex items-center gap-1 hover:text-[#bef264] transition-colors group uppercase tracking-widest text-[8px] sm:text-[9px] md:text-[10px]">
                Get Profile Detail <ArrowRight className="w-2 h-2 sm:w-3 sm:h-3 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shrink-0">
              <div className="w-2 h-2 rounded-full bg-[#a3e635] animate-pulse"></div>
              <span className="text-sm font-medium text-white">Live Session</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium text-text-secondary">Remaining Exercises</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-text-primary">4</span>
              <span className="text-sm text-text-tertiary ml-1">Left</span>
            </div>
            <svg className="w-24 h-8" viewBox="0 0 100 30">
              <path d="M0,15 Q10,5 20,15 T40,15 T60,5 80,25 T100,15" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#ff5e00]" />
              <span className="text-sm font-medium text-text-secondary">Energy Burn</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-text-primary">330</span>
              <span className="text-sm text-text-tertiary ml-1">Kcal</span>
            </div>
            <svg className="w-24 h-8" viewBox="0 0 100 30">
              <path d="M0,25 Q15,5 30,20 T60,10 T90,25 T100,15" fill="none" stroke="#ff5e00" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#a3e635]" />
              <span className="text-sm font-medium text-text-secondary">Workout</span>
            </div>
            <span className="text-text-tertiary">...</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-text-primary">30</span>
              <span className="text-sm text-text-tertiary ml-1">Minutes</span>
            </div>
            <svg className="w-24 h-8" viewBox="0 0 100 30">
              <path d="M0,15 Q20,25 40,10 T70,20 T100,5" fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* Featured Course */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-text-primary">Featured Course</h3>
          <a href="#" className="text-sm font-medium text-[#a3e635] flex items-center gap-1 hover:underline">
            See all <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[
            { title: 'Weight Lifting', level: 'Advanced', img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop' },
            { title: 'Muscle Training', level: 'Intermediate', img: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop' },
            { title: 'CrossFit', level: 'All Levels', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop' }
          ].map((course, i) => (
            <div key={i} className="group relative rounded-2xl overflow-hidden h-48 cursor-pointer">
              <img src={course.img} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute inset-0 p-4 flex flex-col justify-between">
                <div className="flex justify-end">
                  <span className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                    {course.level}
                  </span>
                </div>
                <div className="flex justify-start">
                  <span className="bg-[#a3e635] text-black text-xs font-bold px-3 py-1.5 rounded-lg">{course.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-text-primary">Services</h3>
          <a href="#" className="text-sm font-medium text-[#a3e635] flex items-center gap-1 hover:underline">
            See all <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { title: 'EXERCISE PROGRAM', img: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=1470&auto=format&fit=crop' },
            { title: 'NUTRITION PLANS', img: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1453&auto=format&fit=crop' },
            { title: 'PRACTICE TIME', img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1470&auto=format&fit=crop' },
            { title: 'DIET PROGRAM', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1470&auto=format&fit=crop' }
          ].map((service, i) => (
            <div key={i} className="bg-bg-secondary rounded-2xl overflow-hidden border border-border-primary cursor-pointer hover:border-[#a3e635] transition-colors">
              <div className="h-32 overflow-hidden">
                <img src={service.img} alt={service.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-3 text-center">
                <span className="text-[10px] font-bold text-text-secondary tracking-wider">{service.title}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-bg-secondary rounded-2xl p-6 border border-border-primary">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-[#a3e635]" />
          <h3 className="text-lg font-bold text-text-primary">Weekly Summary</h3>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center divide-x divide-border-primary">
          <div>
            <p className="text-3xl font-bold text-[#a3e635] mb-1">1</p>
            <p className="text-xs text-text-tertiary font-medium">Workouts</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#ff5e00] mb-1">330</p>
            <p className="text-xs text-text-tertiary font-medium">Cal Burned</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#06b6d4] mb-1">30</p>
            <p className="text-xs text-text-tertiary font-medium">Minutes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#ec4899] mb-1">1</p>
            <p className="text-xs text-text-tertiary font-medium">Day Streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
