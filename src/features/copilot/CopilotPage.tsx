import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  User,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Avatar, ScoreBadge } from '../../components/ui/badge';
import type { Candidate } from '../../types';
import { useCopilot } from '../../stores';

interface CopilotPageProps {
  candidates: Candidate[];
  jobs: { job_id: number; role: string }[];
  onViewCandidate?: (id: number) => void;
}

const SUGGESTED_PROMPTS = [
  'Show top 5 candidates',
  'Find candidates with React skills',
  'Compare the top candidates',
  'What is the hiring summary?',
  'Show shortlisted candidates',
  'Who was rejected with high scores?'
];

export function CopilotPage({
  candidates,
  jobs,
  onViewCandidate
}: CopilotPageProps) {
  const [input, setInput] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading: isProcessing, sendMessage, clearHistory } = useCopilot();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const query = input.trim();
    setInput('');

    const context = selectedJob ? { jobId: parseInt(selectedJob) } : undefined;
    await sendMessage(query, candidates, context);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 lg:px-6 py-4 bg-white border-b border-gray-100">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            AI Copilot
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Your intelligent hiring assistant</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedJob}
            onChange={(e) => setSelectedJob(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Jobs</option>
            {jobs.map(j => (
              <option key={j.job_id} value={j.job_id}>{j.role}</option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={clearHistory}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              <div className={`flex flex-col ${message.role === 'user' ? 'items-end max-w-[80%]' : 'max-w-full'}`}>
                <div
                  className={`rounded-xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">{message.content}</p>

                  {/* Candidate Cards */}
                  {message.candidates && message.candidates.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {message.candidates.map((candidate) => (
                        <div
                          key={candidate.candidate_id}
                          onClick={() => onViewCandidate?.(candidate.candidate_id)}
                          className="bg-gray-50 rounded-lg p-3 flex items-center gap-3 hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <Avatar name={candidate.name} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{candidate.name}</p>
                            <p className="text-xs text-gray-500">{candidate.experience_years}y exp</p>
                          </div>
                          {candidate.score !== undefined && (
                            <ScoreBadge score={candidate.score} size="sm" />
                          )}
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {message.actions && message.actions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {message.actions.map((action, idx) => (
                        <Button
                          key={idx}
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (action.type === 'view_candidate' && action.data.candidateId) {
                              onViewCandidate?.(Number(action.data.candidateId));
                            }
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Actions */}
                <div className={`flex gap-2 mt-2 ${message.role === 'user' ? 'justify-end' : ''}`}>
                  {message.role === 'assistant' && (
                    <>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isProcessing && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white rounded-xl px-4 py-3 border border-gray-100">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggested Prompts - Always visible */}
      <div className="px-4 lg:px-6 pb-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs text-gray-500 mb-2">Suggested prompts:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(prompt)}
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 lg:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your candidates..."
              className="flex-1 px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isProcessing}
              isLoading={isProcessing}
              leftIcon={<Send className="w-4 h-4" />}
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
