import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import {
  Shield, AlertTriangle, CheckCircle, Mail, Link as LinkIcon, Activity,
  RefreshCw, LayoutDashboard, List, Search, Settings, Power, ChevronRight,
  PieChart as PieChartIcon, BarChart3, Clock, AlertOctagon, MessageSquare, Send, User, Bot
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

const BACKEND_URL = 'http://127.0.0.1:8000';

interface Report {
  id: number;
  type: string;
  sender: string;
  content: string;
  category: string;
  risk_score: number;
  explanation: string;
  action: string;
  created_at?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const COLORS = {
  safe: '#22c55e', // green-500
  suspicious: '#eab308', // yellow-500
  highRisk: '#ef4444', // red-500
  bgSafe: 'bg-green-500/10 text-green-500 border-green-500/20',
  bgSuspicious: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  bgHighRisk: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function App() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'feed' | 'analyze' | 'settings' | 'chat'>('dashboard');
  
  // Analyze Form State
  const [analyzeType, setAnalyzeType] = useState<'email' | 'link'>('email');
  const [analyzeContent, setAnalyzeContent] = useState('');
  const [analyzeSender, setAnalyzeSender] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm MAYAM, your cybersecurity AI mentor. How can I help you stay safe today?",
      timestamp: new Date()
    }
  ]);
  const [currentChatMessage, setCurrentChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [monitorStarting, setMonitorStarting] = useState(false);
  const [liveMode, setLiveMode] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/reports`);
      setReports(res.data);
    } catch (error) {
      console.error('Failed to fetch reports', error);
    }
    setLoading(false);
  };

  const checkMonitorStatus = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/system/monitor-status`);
      setMonitorRunning(res.data.running);
    } catch (error) {
      console.error('Failed to check monitor status', error);
    }
  };

  useEffect(() => {
    fetchReports();
    checkMonitorStatus();
    
    const reportsInterval = setInterval(fetchReports, liveMode ? 5000 : 30000);
    const statusInterval = setInterval(checkMonitorStatus, 10000);
    
    return () => {
      clearInterval(reportsInterval);
      clearInterval(statusInterval);
    };
  }, [liveMode]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzeContent.trim()) return;

    setAnalyzing(true);
    try {
      const endpoint = analyzeType === 'email' ? '/analyze/email' : '/analyze/link';
      await axios.post(`${BACKEND_URL}${endpoint}`, {
        type: analyzeType,
        sender: analyzeSender,
        content: analyzeContent,
      });
      setAnalyzeContent('');
      setAnalyzeSender('');
      setActiveTab('feed');
      fetchReports();
    } catch (error) {
      console.error('Failed to analyze', error);
      alert('Failed to analyze content. Is the backend running?');
    }
    setAnalyzing(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChatMessage.trim() || sendingChat) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentChatMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentChatMessage('');
    setSendingChat(true);

    try {
      // Get some context from recent reports
      const recentContext = reports.slice(0, 3).map(r => 
        `[${r.type}] ${r.category}: ${r.content.substring(0, 100)}...`
      ).join('\n');

      const res = await axios.post(`${BACKEND_URL}/chat`, {
        message: userMessage.content,
        context: recentContext
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to my brain right now. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    setSendingChat(false);
  };

  const startMonitor = async () => {
    setMonitorStarting(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/system/start-monitor`);
      if (res.data.status === 'success') {
        setMonitorRunning(true);
      } else {
        alert(res.data.message);
      }
    } catch (error) {
      console.error('Failed to start monitor', error);
      alert('Failed to start monitor. Check if backend server is running.');
    }
    setMonitorStarting(false);
  };

  const stopMonitor = async () => {
    setMonitorStarting(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/system/stop-monitor`);
      if (res.data.status === 'success') {
        setMonitorRunning(false);
      } else {
        alert(res.data.message);
      }
    } catch (error) {
      console.error('Failed to stop monitor', error);
      alert('Failed to stop monitor.');
    }
    setMonitorStarting(false);
  };

  const toggleMonitor = () => {
    if (monitorRunning) {
      stopMonitor();
    } else {
      startMonitor();
    }
  };

  const getRiskInfo = (score: number) => {
    if (score >= 70) return { verdict: 'HIGH RISK', color: COLORS.highRisk, theme: COLORS.bgHighRisk, icon: AlertOctagon, label: 'Critical' };
    if (score >= 40) return { verdict: 'SUSPICIOUS', color: COLORS.suspicious, theme: COLORS.bgSuspicious, icon: AlertTriangle, label: 'Warning' };
    return { verdict: 'SAFE', color: COLORS.safe, theme: COLORS.bgSafe, icon: CheckCircle, label: 'Secure' };
  };

  // Analytics derived from reports
  const avgRiskScore = reports.length ? Math.round(reports.reduce((acc, r) => acc + r.risk_score, 0) / reports.length) : 0;
  const highRiskCount = reports.filter(r => r.risk_score >= 70).length;
  const suspiciousCount = reports.filter(r => r.risk_score >= 40 && r.risk_score < 70).length;
  const safeCount = reports.filter(r => r.risk_score < 40).length;

  const pieData = useMemo(() => [
    { name: 'Safe', value: safeCount, color: COLORS.safe },
    { name: 'Suspicious', value: suspiciousCount, color: COLORS.suspicious },
    { name: 'High Risk', value: highRiskCount, color: COLORS.highRisk }
  ].filter(d => d.value > 0), [safeCount, suspiciousCount, highRiskCount]);

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    reports.forEach(r => {
      const c = r.category || 'unknown';
      cats[c] = (cats[c] || 0) + 1;
    });
    return Object.entries(cats).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count).slice(0, 5);
  }, [reports]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <div className="p-1.5 bg-indigo-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <span className="text-lg font-bold tracking-wide bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            MAYAM
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Menu</div>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === 'dashboard' ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('feed')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === 'feed' ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <List className="w-5 h-5" /> Threat Feed
            {highRiskCount > 0 && (
              <span className="ml-auto bg-red-500/20 text-red-400 py-0.5 px-2 rounded-full text-xs font-bold">
                {highRiskCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('analyze')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === 'analyze' ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Search className="w-5 h-5" /> Manual Analysis
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === 'chat' ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MessageSquare className="w-5 h-5" /> AI Mentor
          </button>

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-8 mb-4 px-2">System</div>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
              activeTab === 'settings' ? 'bg-indigo-500/10 text-indigo-400 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-5 h-5" /> Control Panel
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <Shield className={`w-4 h-4 ${monitorRunning ? 'text-green-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Monitor Status</p>
              <p className={`text-xs ${monitorRunning ? 'text-green-400' : 'text-slate-500'} flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${monitorRunning ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
                {monitorRunning ? 'Active' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md z-10 sticky top-0">
          <h1 className="text-xl font-semibold text-white capitalize">
            {activeTab.replace('-', ' ')}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-md border border-slate-700/50">
              <span className="text-xs text-slate-400 font-medium">Live Feed</span>
              <button 
                onClick={() => setLiveMode(!liveMode)}
                className={`w-8 h-4 rounded-full transition-colors relative ${liveMode ? 'bg-indigo-500' : 'bg-slate-600'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${liveMode ? 'left-4.5' : 'left-0.5'}`} />
              </button>
            </div>
            <button
              onClick={fetchReports}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-md transition-colors border border-slate-700/50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Refresh
            </button>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8 pb-20">
          
          {/* DASHBOARD VIEW */}
          {activeTab === 'dashboard' && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* System Controller Header */}
              <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`p-4 rounded-2xl transition-all duration-500 ${monitorRunning ? 'bg-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-slate-800'}`}>
                      <Power className={`w-8 h-8 ${monitorRunning ? 'text-green-400' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        System Control
                        {monitorRunning && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full animate-pulse border border-green-500/30">LIVE</span>}
                      </h2>
                      <p className="text-slate-400 mt-1 max-w-md">
                        {monitorRunning 
                          ? "The security monitor is actively scanning incoming emails and links for potential threats." 
                          : "Start the background monitor to begin automated threat detection and real-time security analysis."}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={toggleMonitor}
                      disabled={monitorStarting}
                      className={`px-8 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center gap-2 ${
                        monitorRunning 
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      }`}
                    >
                      {monitorStarting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
                      {monitorRunning ? 'Stop Monitor' : 'Start Monitor'}
                    </button>
                    {monitorRunning && (
                      <div className="px-6 py-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-2 text-sm text-slate-300">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        Scanning in Background
                      </div>
                    )}
                  </div>
                </div>
                {/* Background decoration */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Total Scanned</p>
                      <p className="text-3xl font-bold text-white mt-1">{reports.length}</p>
                    </div>
                    <div className="p-2.5 bg-blue-500/10 rounded-lg">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Average Risk</p>
                      <p className="text-3xl font-bold text-white mt-1">{avgRiskScore}%</p>
                    </div>
                    <div className="p-2.5 bg-yellow-500/10 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-yellow-400" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Critical Threats</p>
                      <p className="text-3xl font-bold text-red-400 mt-1">{highRiskCount}</p>
                    </div>
                    <div className="p-2.5 bg-red-500/10 rounded-lg">
                      <AlertOctagon className="w-5 h-5 text-red-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg shadow-black/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-slate-400 font-medium">Safe Items</p>
                      <p className="text-3xl font-bold text-green-400 mt-1">{safeCount}</p>
                    </div>
                    <div className="p-2.5 bg-green-500/10 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                
                {/* Risk Distribution */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 col-span-1 lg:col-span-1 flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-6">
                    <PieChartIcon className="w-4 h-4 text-indigo-400" /> Risk Distribution
                  </h3>
                  <div className="flex-1 flex items-center justify-center min-h-[250px]">
                    {reports.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f1f5f9' }}
                            itemStyle={{ color: '#f1f5f9' }}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-slate-500 text-sm flex flex-col items-center">
                        <Activity className="w-8 h-8 mb-2 opacity-20" />
                        No data available
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Threat Categories */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 col-span-1 lg:col-span-2 flex flex-col">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2 mb-6">
                    <BarChart3 className="w-4 h-4 text-indigo-400" /> Top Threat Categories
                  </h3>
                  <div className="flex-1 min-h-[250px]">
                    {categoryData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={true} vertical={false} />
                          <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={100} />
                          <Tooltip 
                            cursor={{ fill: '#1e293b' }}
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                            {categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#6366f1'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                        No categorization data
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Activity Section */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg shadow-black/20">
                <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" /> Recent Interceptions
                  </h3>
                  <button 
                    onClick={() => setActiveTab('feed')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="divide-y divide-slate-800/50">
                  {reports.length > 0 ? (
                    reports.slice(0, 5).map((report) => {
                      const risk = getRiskInfo(report.risk_score);
                      return (
                        <div key={report.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/30 transition-colors group">
                          <div className={`w-2 h-10 rounded-full ${risk.theme.split(' ')[0]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`text-xs font-bold ${risk.color}`}>{risk.verdict}</span>
                              <span className="text-[10px] text-slate-500 font-medium px-1.5 py-0.5 bg-slate-800 rounded uppercase">
                                {report.type}
                              </span>
                              <span className="text-[10px] text-slate-600 ml-auto">
                                ID: #{report.id}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 truncate font-medium">
                              {report.sender || report.content.substring(0, 50)}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {report.explanation}
                            </p>
                          </div>
                          <div className={`px-2 py-1 rounded text-[10px] font-black border ${risk.theme.split(' ').slice(1).join(' ')}`}>
                            {report.risk_score}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-slate-500 text-sm">
                      No recent activity detected
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* THREAT FEED VIEW */}
          {activeTab === 'feed' && (
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Latest Interceptions</h2>
                <div className="text-sm text-slate-400">Showing {reports.length} items</div>
              </div>
              
              <div className="space-y-4">
                {reports.length === 0 ? (
                  <div className="text-center py-20 border border-slate-800 border-dashed rounded-xl bg-slate-900/30">
                    <Shield className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">All clear</p>
                    <p className="text-slate-500 text-sm mt-1">No threats have been detected yet.</p>
                  </div>
                ) : (
                  reports.map((report) => {
                    const risk = getRiskInfo(report.risk_score);
                    const Icon = risk.icon;
                    return (
                      <div key={report.id} className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all shadow-sm">
                        <div className="p-5 flex flex-col md:flex-row gap-6">
                          
                          {/* Left Column: Risk Score & Type */}
                          <div className="flex flex-col items-center justify-center md:w-32 shrink-0 border-b md:border-b-0 md:border-r border-slate-800 pb-4 md:pb-0">
                            <div className={`p-3 rounded-full mb-2 ${risk.theme}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div className={`text-2xl font-black ${risk.color}`}>{report.risk_score}</div>
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 mt-1">{risk.label}</div>
                          </div>

                          {/* Middle Column: Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded flex items-center gap-1.5">
                                {report.type === 'email' ? <Mail className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                {report.type.toUpperCase()}
                              </span>
                              {report.category && (
                                <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-medium rounded">
                                  {report.category}
                                </span>
                              )}
                              <span className="text-xs text-slate-500 ml-auto flex items-center gap-1">
                                <Clock className="w-3 h-3" /> ID: #{report.id}
                              </span>
                            </div>
                            
                            {report.sender && (
                              <div className="text-sm mb-3">
                                <span className="text-slate-500">From: </span>
                                <span className="text-slate-300 font-medium truncate">{report.sender}</span>
                              </div>
                            )}
                            
                            <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800/50 mb-4">
                              <p className="text-slate-300 text-sm line-clamp-2 leading-relaxed">
                                {report.content}
                              </p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">AI Analysis</h4>
                                <p className="text-sm text-slate-300 leading-relaxed">{report.explanation}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommended Action</h4>
                                <p className={`text-sm font-medium ${report.risk_score >= 70 ? 'text-red-400' : 'text-slate-300'}`}>
                                  {report.action || 'None'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ANALYZE VIEW */}
          {activeTab === 'analyze' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                    <Search className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-semibold text-white">Manual Scanner</h2>
                </div>
                <p className="text-slate-400 mb-8 pl-11">Submit suspicious content directly to the MAYAM AI engine for immediate analysis.</p>

                <form onSubmit={handleAnalyze} className="space-y-6">
                  <div className="bg-slate-950/50 p-1.5 rounded-xl border border-slate-800 inline-flex w-full mb-4">
                    <button
                      type="button"
                      onClick={() => setAnalyzeType('email')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        analyzeType === 'email'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Mail className="w-4 h-4" /> Email Content
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnalyzeType('link')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        analyzeType === 'link'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" /> URL / Link
                    </button>
                  </div>

                  {analyzeType === 'email' && (
                    <div>
                      <label htmlFor="sender" className="block text-sm font-medium text-slate-300 mb-2">Sender Email Address</label>
                      <input
                        type="text"
                        id="sender"
                        value={analyzeSender}
                        onChange={(e) => setAnalyzeSender(e.target.value)}
                        placeholder="e.g. security-alert@paypal-update.com"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  )}

                  <div>
                    <label htmlFor="content" className="block text-sm font-medium text-slate-300 mb-2">
                      {analyzeType === 'email' ? 'Email Body' : 'Suspicious URL'}
                    </label>
                    <textarea
                      id="content"
                      required
                      value={analyzeContent}
                      onChange={(e) => setAnalyzeContent(e.target.value)}
                      placeholder={analyzeType === 'email' ? 'Paste the full email text here...' : 'https://suspicious-domain.com/login'}
                      rows={analyzeType === 'email' ? 6 : 2}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={analyzing || !analyzeContent.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:shadow-none"
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Analyzing via AI Engine...
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5" />
                        Run Security Analysis
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* CHAT VIEW */}
          {activeTab === 'chat' && (
            <div className="max-w-3xl mx-auto h-[calc(100vh-12rem)] flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl flex-1 flex flex-col overflow-hidden shadow-xl">
                
                {/* Chat Header */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">AI Cybersecurity Mentor</h2>
                    <p className="text-xs text-slate-500">Powered by MAYAM Intelligence</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${
                          msg.role === 'user' ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-800 border-slate-700'
                        }`}>
                          {msg.role === 'user' ? <User className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/10' 
                            : 'bg-slate-800/50 text-slate-200 border border-slate-700/50 rounded-tl-none'
                        }`}>
                          {msg.content}
                          <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="flex justify-start animate-pulse">
                      <div className="flex max-w-[80%] gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <Bot className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-2xl rounded-tl-none text-slate-400 text-sm">
                          Thinking...
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                  <form onSubmit={handleSendMessage} className="relative">
                    <input
                      type="text"
                      value={currentChatMessage}
                      onChange={(e) => setCurrentChatMessage(e.target.value)}
                      placeholder="Ask anything about security, scams, or safe replies..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-4 pr-12 py-3.5 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!currentChatMessage.trim() || sendingChat}
                      className="absolute right-2 top-1.5 p-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-all"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-600 text-center mt-3 uppercase tracking-tighter">
                    MAYAM mentor can make mistakes. Always verify critical security decisions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS / CONTROL PANEL VIEW */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-6 border-b border-slate-800 bg-slate-900/80 flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg">
                    <Settings className="w-5 h-5 text-slate-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">System Control Panel</h2>
                    <p className="text-sm text-slate-400">Manage backend services and integrations</p>
                  </div>
                </div>
                
                <div className="p-6 space-y-8">
                  
                  {/* Email Integration */}
                  <div className={`flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-5 rounded-xl border transition-all ${monitorRunning ? 'border-green-500/30 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-slate-700/50 bg-slate-800/20'}`}>
                    <div className="flex gap-4">
                      <div className={`p-3 rounded-xl shrink-0 h-fit transition-all duration-500 ${monitorRunning ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                        <Mail className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-white mb-1">Live Email Monitoring</h3>
                        <p className="text-sm text-slate-400 max-w-md">
                          Starts the background process that connects to Gmail API and automatically fetches and scans new emails every 10 seconds.
                        </p>
                        {monitorRunning && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-green-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            ACTIVE - SCANNING INCOMING TRAFFIC
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={toggleMonitor}
                      disabled={monitorStarting}
                      className={`shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all transform active:scale-95 ${
                        monitorRunning 
                          ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                      }`}
                    >
                      {monitorStarting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
                      {monitorRunning ? 'Stop Monitor' : 'Start Monitor'}
                    </button>
                  </div>

                  {/* API Status */}
                  <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-5 rounded-xl border border-slate-700/50 bg-slate-800/20">
                    <div className="flex gap-4">
                      <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl shrink-0 h-fit">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-white mb-1">FastAPI Engine</h3>
                        <p className="text-sm text-slate-400 max-w-md">
                          The core AI analysis engine is currently running on <code className="bg-slate-950 px-1 py-0.5 rounded text-xs">http://127.0.0.1:8000</code>.
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 px-4 py-2 border border-green-500/30 bg-green-500/10 text-green-400 rounded-lg font-medium text-sm flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      Connected
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
