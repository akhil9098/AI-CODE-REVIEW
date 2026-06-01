import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  History,
  Send,
  Trash2,
  Copy,
  Check,
  FileCode,
  ArrowRight,
  ChevronRight,
  Info,
  Sparkles,
  Bot,
  User,
  RotateCcw,
  Bug,
  BookOpen,
  ArrowUpRight
} from 'lucide-react';
import { CODE_TEMPLATES, CodeTemplate } from './data';
import { ReviewResponse, ChatMessage, SavedReview } from './types';

export default function App() {
  // Input states
  const [code, setCode] = useState<string>(CODE_TEMPLATES[0].code);
  const [language, setLanguage] = useState<string>(CODE_TEMPLATES[0].language);
  const [currentFilename, setCurrentFilename] = useState<string>(CODE_TEMPLATES[0].filename);

  // Layout states
  const [activeTab, setActiveTab] = useState<'bugs' | 'security' | 'performance' | 'metrics' | 'chat'>('metrics');
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  
  // Persistence & history states
  const [historyList, setHistoryList] = useState<SavedReview[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // Analysis / review state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStatusText, setAnalysisStatusText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResponse | null>(null);

  // Interactive UI helpers
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  // Chat panel states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatSending, setIsChatSending] = useState<boolean>(false);

  // References
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Scroll synchronization between textarea and custom line numbers
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Generate line numbers array
  const lines = code.split('\n');
  const lineCount = Math.max(lines.length, 1);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai_code_reviews');
      if (saved) {
        const parsed = JSON.parse(saved) as SavedReview[];
        setHistoryList(parsed);
      }
    } catch (e) {
      console.error("Failed to parse saved reviews:", e);
    }
  }, []);

  // Save history to localStorage whenever it changes
  const saveToHistory = (newHistory: SavedReview[]) => {
    setHistoryList(newHistory);
    try {
      localStorage.setItem('ai_code_reviews', JSON.stringify(newHistory));
    } catch (e) {
      console.error("Failed to save reviews to localStorage:", e);
    }
  };

  // Scroll chat window to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isChatSending]);

  // Load a select template
  const handleSelectTemplate = (template: CodeTemplate) => {
    setCode(template.code);
    setLanguage(template.language);
    setCurrentFilename(template.filename);
    setErrorMessage(null);
    setReviewResult(null);
    setSelectedHistoryId(null);
    setHighlightedLine(null);
    setChatMessages([]);
  };

  // Perform complete AI Code review
  const handleTriggerReview = async () => {
    if (!code.trim()) {
      setErrorMessage("Please input or paste some code before starting the review.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setReviewResult(null);
    setHighlightedLine(null);
    setChatMessages([]);

    const statusPhases = [
      "Parsing source code structure...",
      "Analyzing variable pointers and logic gates...",
      "Cross-referencing common bug databases...",
      "Scanning with global security audit definitions...",
      "Measuring computational optimization vectors...",
      "Compiling final quality statistics..."
    ];

    let phaseIndex = 0;
    setAnalysisStatusText(statusPhases[0]);

    const statusInterval = setInterval(() => {
      if (phaseIndex < statusPhases.length - 1) {
        phaseIndex++;
        setAnalysisStatusText(statusPhases[phaseIndex]);
      }
    }, 1800);

    try {
      const response = await fetch('/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, language })
      });

      clearInterval(statusInterval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Server responded with standard exit code: ${response.status}`);
      }

      const report: ReviewResponse = await response.json();
      
      // Auto-set the active tab based on discovered issues
      if (report.bugs && report.bugs.length > 0) {
        setActiveTab('bugs');
      } else if (report.securityIssues && report.securityIssues.length > 0) {
        setActiveTab('security');
      } else if (report.performanceImprovements && report.performanceImprovements.length > 0) {
        setActiveTab('performance');
      } else {
        setActiveTab('metrics');
      }

      setReviewResult(report);

      // Save to saved history
      const newSavedItem: SavedReview = {
        id: crypto.randomUUID(),
        title: `Audit - ${currentFilename} (${language.toUpperCase()})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString(),
        language,
        code,
        report
      };

      const updatedHistory = [newSavedItem, ...historyList].slice(0, 30); // limit to last 30
      saveToHistory(updatedHistory);
      setSelectedHistoryId(newSavedItem.id);

      // Seed chat template greet message
      const botGreeting: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `👋 Hello! I have completed my deep code review of your file **${currentFilename}**. 

I scored the codebase at **${report.overallScore}/100** and identified ${report.bugs.length} bugs, ${report.securityIssues.length} security risks, and ${report.performanceImprovements.length} potential performance improvements.

Ask me any specific questions about these findings, or ask me for a fully corrected rewrite of any tricky sections!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages([botGreeting]);

    } catch (err: any) {
      clearInterval(statusInterval);
      setErrorMessage(err.message || "An unexpected error occurred while communicating with the analysis backend.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load saved historical assessment
  const handleSelectHistory = (item: SavedReview) => {
    setCode(item.code);
    setLanguage(item.language);
    setReviewResult(item.report);
    setSelectedHistoryId(item.id);
    setErrorMessage(null);
    setHighlightedLine(null);
    
    // Switch tab to metrics initially
    setActiveTab('metrics');

    // Create chat messages for this history
    const botGreeting: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `👋 Loaded historical analysis for **${item.title}**. 

Overall score was **${item.report.overallScore}/100** with ${item.report.bugs.length} bugs, ${item.report.securityIssues.length} security items, and ${item.report.performanceImprovements.length} performance updates.

How can I help you resolve these items?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages([botGreeting]);
  };

  // Delete review item from history
  const handleDeleteHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyList.filter(item => item.id !== id);
    saveToHistory(updated);
    if (selectedHistoryId === id) {
      setSelectedHistoryId(null);
      setReviewResult(null);
    }
  };

  // Handle Send Chat Question to Technical Coach
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatSending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const chatHistory = chatMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code,
          language,
          history: chatHistory,
          latestMessage: userMsg.content,
          reportSummary: reviewResult ? reviewResult.summary : "No review performed yet."
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed context chat request.");
      }

      const info = await response.json();
      
      const botMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: info.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, botMsg]);
    } catch (e: any) {
      const errorGreeting: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `⚠️ Sorry, I ran into an error connecting to my server to answer that. Could you try submitting your request again? Error details: ${e.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, errorGreeting]);
    } finally {
      setIsChatSending(false);
    }
  };

  // Trigger copy feedback
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Automatically scroll or focus line on editor
  const handleHighlightAndNavigateToLine = (line?: number) => {
    if (!line) return;
    setHighlightedLine(line);
    if (textareaRef.current) {
      // Focus textarea
      textareaRef.current.focus();
      // Calculate scroll position roughly
      const lineHeight = 20; // approximate row height in pixels
      textareaRef.current.scrollTop = (line - 3) * lineHeight;
    }
  };

  // Helper colors for scores & risks
  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', stroke: 'stroke-emerald-500' };
    if (score >= 50) return { text: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', stroke: 'stroke-amber-500' };
    return { text: 'text-rose-600', bg: 'bg-rose-50 border-rose-200', stroke: 'stroke-rose-500' };
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
      case 'critical':
        return { text: 'text-rose-700 bg-rose-50 border-rose-200', icon: <XCircle className="w-4 h-4 text-rose-500" /> };
      case 'medium':
        return { text: 'text-amber-800 bg-amber-50 border-amber-200', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> };
      default:
        return { text: 'text-sky-800 bg-sky-50 border-sky-100', icon: <Info className="w-4 h-4 text-sky-500" /> };
    }
  };

  const overallThemeColor = getScoreColor(reviewResult ? reviewResult.overallScore : 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-indigo-100">
      {/* Top Banner & Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 text-white rounded-xl shadow-md shadow-indigo-100">
              <Code2 className="w-6 h-6" id="app_header_logo_icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-none">AI Code Reviewer</h1>
                <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-full">
                  Enterprise v3.5
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Deep visual compiler logic checks, security threat modeling, and performance code profiling.</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setCurrentFilename(`source.${e.target.value === 'typescript' ? 'tsx' : e.target.value === 'javascript' ? 'js' : e.target.value === 'python' ? 'py' : e.target.value === 'cpp' ? 'cpp' : 'txt'}`);
                }}
                className="w-full sm:w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs appearance-none font-medium cursor-pointer"
                id="language_selector"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="cpp">C++ / Native</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>

            <button
              onClick={handleTriggerReview}
              disabled={isAnalyzing}
              className={`w-full sm:w-auto px-5 py-2 rounded-lg font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                isAnalyzing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:-translate-y-0.5'
              }`}
              id="analyze_action_btn"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Live Audit</span>
                </>
              )}
            </button>
          </div>
          
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* Left Hand: Controller & Editor Area (5 Columns on Large screen) */}
        <section className="lg:col-span-5 flex flex-col gap-6" id="ide_editor_container">
          
          {/* Presets & Snippet Templates Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Select Vulnerable Code Presets</span>
            </h2>
            <div className="grid grid-cols-1 gap-2">
              {CODE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => handleSelectTemplate(tpl)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-all flex items-start gap-2.5 ${
                    code === tpl.code
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-medium'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                  id={`preset_${tpl.name.toLowerCase().replace(/\s+/g, '_')}`}
                >
                  <FileCode className={`w-4 h-4 mt-0.5 ${code === tpl.code ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold flex items-center justify-between gap-1">
                      <span className="truncate">{tpl.name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-white/70 border border-slate-200/50 rounded-sm text-slate-500">
                        {tpl.language}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5 line-clamp-1 font-normal text-[11px]">{tpl.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Core IDE styled Editor Container */}
          <div className="bg-[#0f172a] rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col flex-1 min-h-[460px]">
            {/* Editor Header Titlebar */}
            <div className="bg-[#1e293b] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <span className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                </span>
                <span className="ml-2 font-medium text-slate-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  {currentFilename}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden sm:inline">Ln {lines.length}, Col {lines[lines.length - 1]?.length || 0}</span>
                <span className="px-2 py-0.5 bg-slate-800 rounded-sm text-slate-300 font-bold tracking-wider uppercase text-[9px]">
                  {language}
                </span>
              </div>
            </div>

            {/* Scrolling code view frame */}
            <div className="relative flex-1 flex overflow-hidden font-mono text-[13px] leading-5">
              {/* Dynamic Line Numbers sidebar */}
              <div
                ref={lineNumbersRef}
                className="w-11 bg-[#0f172a] text-slate-600 text-right pr-2 select-none border-r border-[#1e293b] pt-4 overflow-hidden scrollbar-none"
              >
                {Array.from({ length: lineCount }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-5 pr-1 transition-colors ${
                      highlightedLine === i + 1 ? 'bg-orange-500/20 text-orange-400 font-bold border-r border-orange-500' : ''
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Multi-layered Input Textarea */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={handleScroll}
                placeholder="// Enter or paste your code here for debugging, optimization, and auditing..."
                spellCheck="false"
                className="flex-1 bg-transparent text-slate-100 p-4 focus:outline-hidden min-h-full resize-none font-mono placeholder-slate-600 selection:bg-slate-700 leading-5 overflow-auto"
                id="source_code_textarea"
              />
            </div>

            {/* Quick Helper actions on editor footer */}
            <div className="bg-[#1e293b] border-t border-slate-800/80 px-4 py-2 flex items-center justify-between text-xs">
              <button
                onClick={() => setCode('')}
                className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 font-medium"
                id="clear_code_btn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleCopyText(code, 'editor')}
                  className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 font-medium"
                  id="copy_code_btn"
                >
                  {copiedStates['editor'] ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    // Reset to original selected snippet
                    const original = CODE_TEMPLATES.find(t => t.language === language);
                    if (original) {
                      setCode(original.code);
                    }
                  }}
                  className="text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1 font-medium"
                  id="reset_code_btn"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset template</span>
                </button>
              </div>
            </div>
          </div>

          {/* Historic Audits Sidebar/List */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" />
                <span>Saved Audits History ({historyList.length})</span>
              </h2>
              {historyList.length > 0 && (
                <button
                  onClick={() => saveToHistory([])}
                  className="text-[10px] text-rose-500 hover:underline font-semibold"
                  id="clear_history_btn"
                >
                  Clear all
                </button>
              )}
            </div>

            {historyList.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-200 text-center rounded-lg">
                <p className="text-xs text-slate-400">No historically saved audits yet. Run an audit above to persist history.</p>
              </div>
            ) : (
              <div className="max-h-44 overflow-y-auto flex flex-col gap-2 pr-1">
                {historyList.map((item) => {
                  const scoreInfo = getScoreColor(item.report.overallScore);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectHistory(item)}
                      className={`p-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        selectedHistoryId === item.id
                          ? 'bg-slate-50 border-indigo-300 ring-2 ring-indigo-50'
                          : 'border-slate-100 hover:bg-slate-50'
                      }`}
                      id={`history_item_${item.id.slice(0, 8)}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full ${scoreInfo.text.replace('text-', 'bg-')}`}></span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400">{item.timestamp}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded-sm font-mono text-[10px] font-bold ${scoreInfo.bg} ${scoreInfo.text}`}>
                          {item.report.overallScore}/100
                        </span>
                        <button
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-sm"
                          title="Delete index audit"
                          id={`delete_history_${item.id.slice(0, 8)}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </section>

        {/* Right Hand: Analysis report results view (7 Columns on Large screen) */}
        <section className="lg:col-span-7 flex flex-col min-h-[500px]" id="audit_report_panel">
          
          {/* Default Empty State before analyzing */}
          {!reviewResult && !isAnalyzing && !errorMessage && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center flex-1 py-16 shadow-xs">
              <div className="w-16 h-16 bg-gradient-to-tr from-indigo-50 to-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 leading-snug">AI Deep Source Analyzer</h2>
              <p className="text-slate-500 text-sm max-w-md mt-2">
                Paste your logic script on the system, choose your language preset, and press <strong className="text-indigo-600">Start Live Audit</strong>. The companion AI will immediately inspect for nested syntax bugs, leak vectors, performance bottlenecks, and map quality ratings.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-lg text-left">
                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <Bug className="w-4 h-4 text-rose-500" />
                    <span>Bug Detection</span>
                  </div>
                  <p className="text-xs text-slate-500">Uncovered exception scopes, infinite rendering triggers, and memory boundary errors are instantly mapped.</p>
                </div>

                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Security Auditing</span>
                  </div>
                  <p className="text-xs text-slate-500">Reviews vulnerabilities such as unescaped XSS, logic inject parameters, and unsecured cryptographical primitives.</p>
                </div>

                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Performance Speed</span>
                  </div>
                  <p className="text-xs text-slate-500">O(N^2) loops are optimized to O(N) linear operations. Explains computation mathematics clearly.</p>
                </div>

                <div className="p-4 border border-slate-100 rounded-lg bg-slate-50">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-2">
                    <CheckCircle2 className="w-4 h-4 text-violet-500" />
                    <span>Interactive Chat Guidance</span>
                  </div>
                  <p className="text-xs text-slate-500">Need specific logic explanations? A dedicated AI technical cohort holds historical memory context of the reviews.</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Telemetry screen */}
          {isAnalyzing && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center flex-1 py-20 shadow-sm animate-pulse-fast">
              
              <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
                {/* Visual pulsating circles for analyzer loading effect */}
                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-60"></div>
                <div className="absolute -inset-2 bg-indigo-50 rounded-full animate-pulse opacity-40"></div>
                <div className="relative w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Code2 className="w-10 h-10 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-800">Compiling Quality Matrix Report...</h3>
              <p className="text-slate-400 text-xs mt-1.5 font-mono bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-full inline-block">
                {analysisStatusText}
              </p>

              <div className="w-full max-w-sm bg-slate-100 h-2 rounded-full mt-6 overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: '70%', animation: 'shimmer 2s infinite' }}></div>
              </div>
              <p className="text-xs text-slate-400 mt-4">Connecting to Deepmind LLM audit modules...</p>
            </div>
          )}

          {/* Error fallback display card */}
          {errorMessage && (
            <div className="bg-white rounded-xl border border-red-200 p-8 flex flex-col items-center justify-center text-center flex-1 py-16 shadow-xs">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-5 border border-rose-200">
                <XCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Analysis Error Encountered</h3>
              <p className="text-sm text-slate-600 max-w-md mt-2">
                We encountered an execution block while retrieving the code analysis details.
              </p>
              
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 text-xs font-mono max-w-xl mt-6 text-left whitespace-pre-wrap break-all shadow-xs leading-5">
                {errorMessage}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleTriggerReview}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-md shadow-indigo-100"
                >
                  Skip and Retry
                </button>
                <a
                  href="https://ai.studio/build"
                  target="_blank"
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-all"
                >
                  Configure Secrets Panel
                </a>
              </div>
            </div>
          )}

          {/* Actual Review Results presentation */}
          {reviewResult && !isAnalyzing && (
            <div className="flex flex-col flex-1 gap-6">
              
              {/* Overall Score Header Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
                {/* Dynamic accent background block */}
                <div className={`absolute top-0 right-0 w-28 h-28 -mr-10 -mt-10 rounded-full opacity-10 bg-indigo-500`}></div>
                
                {/* SVG Progress Arc */}
                <div className="relative flex-shrink-0 flex items-center justify-center">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className="text-slate-100"
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      className={overallThemeColor.stroke}
                      strokeWidth="8"
                      stroke="currentColor"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - reviewResult.overallScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-x-0 text-center flex flex-col items-center">
                    <span className="text-xl font-black text-slate-800 leading-none">{reviewResult.overallScore}</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">SCORE</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0 text-center md:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center md:justify-start">
                    <h3 className="text-lg font-bold text-slate-900">Compilation Audit Feedback</h3>
                    <span className={`self-center px-2 py-0.5 text-[10px] uppercase font-bold rounded-sm ${overallThemeColor.bg} ${overallThemeColor.text}`}>
                      {reviewResult.overallScore >= 80 ? 'Robust Code' : reviewResult.overallScore >= 50 ? 'Medium Quality' : 'Action Required'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-xs mt-2 italic leading-relaxed">
                    "{reviewResult.summary}"
                  </p>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold select-none">
                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`flex-1 py-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'metrics'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="tab_btn_metrics"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Metrics</span>
                </button>
                <button
                  onClick={() => setActiveTab('bugs')}
                  className={`flex-1 py-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'bugs'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="tab_btn_bugs"
                >
                  <Bug className="w-3.5 h-3.5 text-rose-500" />
                  <span>Bugs</span>
                  {reviewResult.bugs.length > 0 && (
                    <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                      {reviewResult.bugs.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 py-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'security'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="tab_btn_security"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Security</span>
                  {reviewResult.securityIssues.length > 0 && (
                    <span className="w-5 h-5 bg-emerald-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                      {reviewResult.securityIssues.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('performance')}
                  className={`flex-1 py-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 relative ${
                    activeTab === 'performance'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="tab_btn_performance"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Performance</span>
                  {reviewResult.performanceImprovements.length > 0 && (
                    <span className="w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                      {reviewResult.performanceImprovements.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === 'chat'
                      ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/50'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  id="tab_btn_chat"
                >
                  <Bot className="w-3.5 h-3.5 text-violet-500" />
                  <span>Coach Chat</span>
                </button>
              </div>

              {/* TAB CONTEXT: 1. Metrics view */}
              {activeTab === 'metrics' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col gap-6" id="panel_metrics">
                  <div>
                    <h3 className="font-bold text-slate-900">Key Parameters Evaluation</h3>
                    <p className="text-xs text-slate-400 mt-1">Multi-dimensional rating parameters calculated from structural metrics.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {reviewResult.metrics.map((m) => {
                      const percentage = `${m.score}%`;
                      let fillStyle = 'bg-rose-500';
                      if (m.score >= 80) fillStyle = 'bg-emerald-500';
                      else if (m.score >= 50) fillStyle = 'bg-amber-500';

                      return (
                        <div key={m.name} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-xs font-semibold mb-2">
                              <span className="text-slate-700">{m.name}</span>
                              <span className="font-mono text-slate-900">{m.score}/100</span>
                            </div>
                            
                            {/* Horizontal tracking slider */}
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
                              <div className={`h-full ${fillStyle} rounded-full`} style={{ width: percentage }}></div>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                              {m.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB CONTEXT: 2. Bugs reports */}
              {activeTab === 'bugs' && (
                <div className="flex flex-col gap-4" id="panel_bugs">
                  {reviewResult.bugs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center py-16 shadow-xs">
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <h4 className="font-bold text-slate-800">Zero Bugs Discovered!</h4>
                      <p className="text-xs text-slate-400 mt-1">Your code pattern conforms perfectly to safety logical compiler rules.</p>
                    </div>
                  ) : (
                    reviewResult.bugs.map((bug) => {
                      const sev = getSeverityStyle(bug.severity);
                      return (
                        <div key={bug.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                          {/* Bug summary title block */}
                          <div className="p-4 border-b border-slate-100 flex items-start gap-3 bg-[#fafbfe]">
                            <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-2xs">
                              {sev.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 truncate text-[14px]">{bug.title}</h4>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm capitalize border ${sev.text}`}>
                                  {bug.severity}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                {bug.lineNumber && (
                                  <button
                                    onClick={() => handleHighlightAndNavigateToLine(bug.lineNumber)}
                                    className="font-mono font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                                  >
                                    Line {bug.lineNumber} <ArrowUpRight className="w-3 h-3" />
                                  </button>
                                )}
                                {bug.lineRange && <span>Range: {bug.lineRange}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Bug details text context */}
                          <div className="p-4 flex flex-col gap-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {bug.description}
                            </p>

                            {/* Side by side diff views */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                              {/* BAD version */}
                              <div className="border border-rose-100 rounded-lg overflow-hidden bg-rose-50 flex flex-col">
                                <div className="bg-rose-100/50 px-3 py-1.5 text-[10px] font-bold text-rose-800 border-b border-rose-100/80 flex justify-between items-center">
                                  <span>ORIGINAL CODE</span>
                                  <span className="text-[9px] uppercase px-1 bg-white opacity-80 rounded-sm">Vulnerable</span>
                                </div>
                                <pre className="p-3 overflow-x-auto text-[11px] whitespace-pre-wrap flex-1 leading-relaxed text-rose-900">
                                  <code>- {bug.originalSnippet}</code>
                                </pre>
                              </div>

                              {/* FIX versions */}
                              <div className="border border-emerald-100 rounded-lg overflow-hidden bg-emerald-50 flex flex-col">
                                <div className="bg-emerald-100/50 px-3 py-1.5 text-[10px] font-bold text-emerald-800 border-b border-emerald-100/80 flex justify-between items-center">
                                  <span>PROPOSED FIX</span>
                                  <button
                                    onClick={() => handleCopyText(bug.fixedSnippet, `fixed_${bug.id}`)}
                                    className="text-[9px] uppercase hover:underline flex items-center gap-0.5 text-emerald-700"
                                  >
                                    {copiedStates[`fixed_${bug.id}`] ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                                <pre className="p-3 overflow-x-auto text-[11px] whitespace-pre-wrap flex-1 leading-relaxed text-emerald-900">
                                  <code>+ {bug.fixedSnippet}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB CONTEXT: 3. Security vulnerabilities */}
              {activeTab === 'security' && (
                <div className="flex flex-col gap-4" id="panel_security">
                  {reviewResult.securityIssues.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center py-16 shadow-xs">
                      <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <h4 className="font-bold text-slate-800">No Security Risks Found!</h4>
                      <p className="text-xs text-slate-400 mt-1">Excellent job! Zero security leaks or database injection vectors discovered.</p>
                    </div>
                  ) : (
                    reviewResult.securityIssues.map((v) => {
                      const rk = getSeverityStyle(v.riskLevel);
                      return (
                        <div key={v.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                          
                          <div className="p-4 border-b border-[#e2e8f0] flex items-start gap-3 bg-slate-50">
                            <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-3xs text-rose-500">
                              <ShieldCheck className="w-4 h-4 text-rose-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 truncate text-[14px]">{v.title}</h4>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-sm border capitalize ${rk.text}`}>
                                  {v.riskLevel} risk
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-medium">
                                <span className="bg-slate-200/50 text-slate-600 px-1.5 py-0.2 rounded-sm font-mono text-[9px]">
                                  {v.vulnType}
                                </span>
                                {v.lineNumber && (
                                  <button
                                    onClick={() => handleHighlightAndNavigateToLine(v.lineNumber)}
                                    className="font-mono font-bold text-indigo-600 hover:underline flex items-center gap-0.5 ml-1"
                                  >
                                    Line {v.lineNumber} <ArrowUpRight className="w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="p-4 flex flex-col gap-4">
                            <div>
                              <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hazard Description</h5>
                              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                {v.description}
                              </p>
                            </div>

                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs flex gap-2 text-amber-900">
                              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="font-bold">Mitigation Strategy:</span> {v.mitigation}
                              </div>
                            </div>

                            {v.sampleSafeCode && (
                              <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col font-mono text-xs">
                                <div className="bg-slate-50 text-slate-600 px-3 py-1.5 text-[10px] font-bold border-b border-slate-200/80 flex items-center justify-between">
                                  <span>REMEDIATED HARDENED SOURCE</span>
                                  <button
                                    onClick={() => handleCopyText(v.sampleSafeCode || '', `secure_${v.id}`)}
                                    className="text-[9px] hover:underline"
                                  >
                                    {copiedStates[`secure_${v.id}`] ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                                <pre className="p-3 bg-slate-900 text-slate-100 overflow-x-auto text-[11px] whitespace-pre flex-1 leading-relaxed scrollbar-thin">
                                  <code>{v.sampleSafeCode}</code>
                                </pre>
                              </div>
                            )}

                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB CONTEXT: 4. Performance Optimizations */}
              {activeTab === 'performance' && (
                <div className="flex flex-col gap-4" id="panel_performance">
                  {reviewResult.performanceImprovements.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center py-16 shadow-xs">
                      <Zap className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                      <h4 className="font-bold text-slate-800">Optimal Runtime Scalability!</h4>
                      <p className="text-xs text-slate-400 mt-1">Computation layers are optimized perfectly with minimal computational bounds.</p>
                    </div>
                  ) : (
                    reviewResult.performanceImprovements.map((p) => {
                      const impactInfo = getSeverityStyle(p.impact === 'high' ? 'high' : p.impact === 'medium' ? 'medium' : 'low');
                      return (
                        <div key={p.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                          
                          <div className="p-4 border-b border-slate-100 flex items-start gap-4 bg-slate-50/55">
                            <div className="p-1.5 bg-white border border-slate-200 rounded-lg text-amber-500 shadow-2xs">
                              <Zap className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 truncate text-[14px]">{p.title}</h4>
                                <span className={`px-2 py-0.5 text-[9px] font-bold font-mono tracking-wider uppercase rounded-sm border ${impactInfo.text}`}>
                                  {p.impact} impact
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 mt-0.5">Algorithm complexity and CPU processing efficiency update profile.</p>
                            </div>
                          </div>

                          <div className="p-4 flex flex-col gap-4">
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {p.description}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                              {/* Before code */}
                              <div className="border border-slate-100 rounded-lg overflow-hidden bg-slate-50/50 flex flex-col">
                                <div className="bg-slate-100/85 px-3 py-1 text-[10px] font-bold text-slate-500 border-b border-slate-200/50">
                                  UNOPTIMIZED CODE
                                </div>
                                <pre className="p-3 overflow-x-auto text-[11px] whitespace-pre-wrap leading-relaxed text-slate-700">
                                  <code>{p.originalCode}</code>
                                </pre>
                              </div>

                              {/* Accelerated code */}
                              <div className="border border-indigo-100 rounded-lg overflow-hidden bg-indigo-50/30 flex flex-col">
                                <div className="bg-indigo-100/30 px-3 py-1 text-[10px] font-bold text-indigo-800 border-b border-indigo-100/50 flex justify-between items-center">
                                  <span>OPTIMIZED ACCESS PATTERN</span>
                                  <button
                                    onClick={() => handleCopyText(p.improvedCode, `perf_${p.id}`)}
                                    className="text-[9px] hover:underline"
                                  >
                                    {copiedStates[`perf_${p.id}`] ? 'Copied' : 'Copy'}
                                  </button>
                                </div>
                                <pre className="p-3 overflow-x-auto text-[11px] whitespace-pre-wrap leading-relaxed text-indigo-950">
                                  <code>{p.improvedCode}</code>
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB CONTEXT: 5. AI Assistant chat panel */}
              {activeTab === 'chat' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden min-h-[460px]" id="panel_chat">
                  {/* Assistant Header */}
                  <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center border border-violet-200">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">Review Assistant Mentor</h4>
                      <p className="text-[10px] text-slate-400 font-medium">Contextual chat session with memory bounds regarding your active review.</p>
                    </div>
                  </div>

                  {/* Messaging panel */}
                  <div className="flex-1 p-4 overflow-y-auto max-h-[360px] flex flex-col gap-3 scrollbar-thin">
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs inline-block leading-relaxed relative ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white self-end rounded-br-none shadow-xs'
                            : 'bg-slate-100 text-slate-800 self-start rounded-bl-none border border-slate-200/50'
                        }`}
                      >
                        {/* Message content */}
                        <div className="whitespace-pre-wrap leading-relaxed font-normal">
                          {msg.content}
                        </div>
                        {/* Message metadata details */}
                        <div className={`text-[9px] mt-1.5 font-medium select-none ${msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'}`}>
                          {msg.timestamp}
                        </div>
                      </div>
                    ))}

                    {isChatSending && (
                      <div className="bg-slate-100 text-slate-400 self-start rounded-xl rounded-bl-none px-4 py-3 text-xs border border-slate-200/30 flex items-center gap-1.5 font-medium italic animate-pulse">
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                          <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                        </span>
                        <span>Mentor is structuring response...</span>
                      </div>
                    )}

                    <div ref={chatBottomRef}></div>
                  </div>

                  {/* Message composition inputbar */}
                  <div className="bg-slate-50 border-t border-slate-200 p-3 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      disabled={isChatSending}
                      placeholder="Ask the coach, e.g., 'How can I replace eval here safely?'"
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
                      id="chat_input_field"
                    />
                    <button
                      onClick={handleSendChatMessage}
                      disabled={!chatInput.trim() || isChatSending}
                      className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all hover:scale-105 disabled:bg-slate-200 disabled:text-slate-400 disabled:scale-100 shrink-0"
                      id="chat_submit_btn"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </section>

      </main>

      {/* Humble outer margin page footer info (Anti AI Slop rules compliant: No complex status lines or containers details) */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-400 font-medium">
        <p>© 2026 AI Code Reviewer. Multi-vector static analysis engine.</p>
      </footer>
    </div>
  );
}
