import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Send, Bot, User, ArrowRight, AlertTriangle,
  TrendingDown, TrendingUp, ShieldCheck, Fuel, Wrench, RefreshCw
} from 'lucide-react';
import { useFleetData } from '../hooks/useFleetData';
import {
  SUGGESTED_QUESTIONS, generateFleetAiResponse, AiChatMessage
} from '../services/aiIntelligence';
import { formatCurrency } from '../utils/formatters';

export const AiIntelligencePage: React.FC = () => {
  const navigate = useNavigate();
  const { buses, serviceRecords, fuelRecords, expenses } = useFleetData();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<AiChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Hello Tejeshwar! I am **FleetMind AI**, your real-time logistics analytics assistant. I continuously evaluate your fleet's GPS telematics, workshop repair queues, fuel efficiency curves, and operating expenditures.\n\nClick on any suggested query below or type your custom operational question to generate immediate data-driven diagnostics.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: AiChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);

    setTimeout(() => {
      const response = generateFleetAiResponse(queryText);
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#00C2FF]/10 text-[#00C2FF] border border-[#00C2FF]/20 uppercase tracking-wider">
              Autonomous Fleet Intelligence
            </span>
            <span className="text-xs text-slate-400">Local Deterministic Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white font-heading tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#00C2FF]" />
            FleetMind AI Intelligence Workspace
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ask complex queries, detect telematics anomalies, evaluate preventive maintenance, and simulate cost savings.
          </p>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: `init-${Date.now()}`,
                sender: 'assistant',
                text: 'Chat history reset. How can I help optimize your fleet operations today?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#0F2742] hover:bg-white/5 text-slate-300 border border-white/10 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Clear Conversation
        </button>
      </div>

      {/* Suggested Questions Quick Grid */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-400 font-heading uppercase tracking-wider">
          Suggested Operational Inquiries:
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#0F2742] hover:bg-[#00C2FF]/10 text-slate-300 hover:text-[#00C2FF] border border-white/5 hover:border-[#00C2FF]/30 transition-all text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area & Live Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Stream (2 cols) */}
        <div className="lg:col-span-2 bg-[#0F2742] rounded-2xl border border-white/5 flex flex-col h-[600px] overflow-hidden">
          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-blue-500/20">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#00C2FF] text-slate-950 font-medium rounded-tr-sm shadow-md'
                    : 'bg-[#0B1F3A] text-slate-100 border border-white/5 rounded-tl-sm shadow-inner'
                }`}>
                  <div className="prose prose-invert prose-xs max-w-none whitespace-pre-line">
                    {m.text}
                  </div>

                  {/* Metrics pill container if any */}
                  {m.metrics && m.metrics.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/10">
                      {m.metrics.map((met, i) => (
                        <div key={i} className="p-2 rounded-xl bg-[#08111F] border border-white/5 text-center">
                          <span className="text-[10px] text-slate-400 block">{met.label}</span>
                          <span className="text-xs font-bold text-white mt-0.5 block font-mono">{met.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.actionLink && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-end">
                      <button
                        onClick={() => navigate(m.actionLink!)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#00C2FF] hover:underline"
                      >
                        {m.actionText || 'View Related Workspace'} <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <span className={`block text-[10px] mt-2 text-right ${
                    m.sender === 'user' ? 'text-slate-800' : 'text-slate-500'
                  }`}>
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 items-center text-xs text-slate-400">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-[#00C2FF] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white animate-spin" />
                </div>
                <span>FleetMind AI is analyzing stored telematics and financial logs...</span>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 sm:p-4 bg-[#0B1F3A] border-t border-white/5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputQuery);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask FleetMind AI (e.g. Which vehicles have high fuel usage?)..."
                className="flex-1 bg-[#08111F] border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#00C2FF]/50"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#00C2FF] hover:bg-[#00C2FF]/90 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-[#00C2FF]/20 flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </form>
          </div>
        </div>

        {/* Live Diagnostics & Optimization Panel (1 col) */}
        <div className="space-y-4">
          {/* Anomaly Detection Card */}
          <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm font-heading">Automated Anomaly Watch</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              2 active telematics exceptions flagged across 8 operational coaches:
            </p>
            <div className="p-3 rounded-xl bg-[#08111F] border border-white/5 space-y-1">
              <span className="font-bold text-white text-xs">Bus FM-108: Fuel Variance</span>
              <p className="text-[11px] text-slate-400">
                Consumption 4.3 km/L on Bengaluru-Chennai expressway (benchmark: 4.8 km/L). Excess idling detected.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[#08111F] border border-white/5 space-y-1">
              <span className="font-bold text-white text-xs">Bus FM-103: Battery Cell Temp</span>
              <p className="text-[11px] text-slate-400">
                Cell Pack 4 reached 44°C during regenerative deceleration. Scheduled for Bay 2 inspection.
              </p>
            </div>
          </div>

          {/* Cost Optimization Highlights */}
          <div className="bg-[#0F2742] rounded-2xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-white text-sm font-heading">Cost Reduction Opportunities</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Bulk Spares Restock:</span>
                <span className="font-bold text-emerald-400">Save ₹18,500</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Idling Cutoff Compliance:</span>
                <span className="font-bold text-emerald-400">Save ₹31,000/mo</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Tire Alignment Tuning:</span>
                <span className="font-bold text-emerald-400">Save ₹42,000/yr</span>
              </div>
            </div>
          </div>

          {/* Model Transparency Note */}
          <div className="p-4 rounded-2xl bg-[#08111F] border border-white/5 text-[11px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 block font-heading">Deterministic Analytics Layer</span>
            <p>
              Answers are computed directly from the local relational database without third-party LLM data exposure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
