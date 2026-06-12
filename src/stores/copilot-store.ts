import { useState, useCallback } from 'react';
import type { CopilotMessage, Candidate } from '../types';
import { uuidv4 } from '../utils/uuid';

export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I am your AI Copilot for hiring. I can help you find candidates, compare profiles, analyze skills gaps, and make data-driven hiring decisions. What would you like to explore?',
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (
    query: string,
    candidates: Candidate[],
    _context?: { jobId?: number; department?: string }
  ) => {
    const userMessage: CopilotMessage = {
      id: uuidv4(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await processCopilotQuery(query, candidates, _context);
      const assistantMessage: CopilotMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date().toISOString(),
        candidates: response.candidates,
        actions: response.actions
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: CopilotMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your query.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your AI Copilot for hiring. How can I help you today?',
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearHistory
  };
}

async function processCopilotQuery(
  query: string,
  candidates: Candidate[],
  _context?: { jobId?: number; department?: string }
): Promise<{ content: string; candidates?: Candidate[]; actions?: CopilotMessage['actions'] }> {
  const queryLower = query.toLowerCase();

  // Top candidates
  if (queryLower.includes('top') && (queryLower.includes('candidate') || queryLower.includes('candidate'))) {
    const count = extractNumber(query) || 5;
    const topCandidates = candidates
      .filter(c => c.score !== undefined)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, count);

    return {
      content: `Here are the top ${count} candidates based on their scores:`,
      candidates: topCandidates,
      actions: topCandidates.slice(0, 3).map(c => ({
        type: 'view_candidate' as const,
        label: `View ${c.name}`,
        data: { candidateId: c.candidate_id }
      }))
    };
  }

  // Find by skill
  if (queryLower.includes('skill') || queryLower.includes('find') && queryLower.includes('with')) {
    const skillMatch = query.match(/(?:skill|with)\s+(\w+)/i);
    const skill = skillMatch ? skillMatch[1].toLowerCase() : '';
    const matchingCandidates = candidates.filter(c =>
      c.skills.toLowerCase().includes(skill)
    );

    return {
      content: matchingCandidates.length > 0
        ? `Found ${matchingCandidates.length} candidates with ${skill} skills:`
        : `No candidates found with ${skill} skills. Try a different skill or check the skill gap analysis.`,
      candidates: matchingCandidates,
      actions: matchingCandidates.slice(0, 3).map(c => ({
        type: 'view_candidate' as const,
        label: `View ${c.name}`,
        data: { candidateId: c.candidate_id }
      }))
    };
  }

  // Shortlisted candidates
  if (queryLower.includes('shortlist')) {
    const shortlisted = candidates.filter(c => c.status === 'shortlisted');
    return {
      content: `There are ${shortlisted.length} candidates currently shortlisted:`,
      candidates: shortlisted,
      actions: shortlisted.slice(0, 3).map(c => ({
        type: 'view_candidate' as const,
        label: `View ${c.name}`,
        data: { candidateId: c.candidate_id }
      }))
    };
  }

  // Rejected candidates
  if (queryLower.includes('reject')) {
    const rejected = candidates.filter(c => c.status === 'rejected');
    const highScoreRejected = rejected.filter(c => (c.score || 0) >= 60);

    return {
      content: highScoreRejected.length > 0
        ? `Found ${highScoreRejected.length} rejected candidates with scores above 60 who might deserve a second review:`
        : `There are ${rejected.length} rejected candidates.`,
      candidates: highScoreRejected.length > 0 ? highScoreRejected : rejected,
    };
  }

  // Compare candidates
  if (queryLower.includes('compare')) {
    const topTwo = candidates
      .filter(c => c.score !== undefined)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 2);

    if (topTwo.length < 2) {
      return { content: 'Not enough candidates with scores to compare.' };
    }

    const [c1, c2] = topTwo;
    const comparison = `${c1.name} (${c1.score}%) vs ${c2.name} (${c2.score}%)\n\n` +
      `Skills: ${c1.skills.split(',').length} vs ${c2.skills.split(',').length}\n` +
      `Experience: ${c1.experience_years} years vs ${c2.experience_years} years`;

    return {
      content: `Comparison of top 2 candidates:\n\n${comparison}`,
      candidates: topTwo,
      actions: [
        { type: 'compare' as const, label: 'Detailed Comparison', data: { ids: topTwo.map(c => c.candidate_id) } }
      ]
    };
  }

  // Average/summary
  if (queryLower.includes('average') || queryLower.includes('summary') || queryLower.includes('overview')) {
    const avgScore = candidates.length > 0
      ? (candidates.reduce((sum, c) => sum + (c.score || 0), 0) / candidates.length).toFixed(1)
      : 0;

    const stageCounts = {
      applied: candidates.filter(c => c.status === 'applied').length,
      shortlisted: candidates.filter(c => c.status === 'shortlisted').length,
      interviewed: candidates.filter(c => c.status === 'interviewed').length,
      hired: candidates.filter(c => c.status === 'hired').length,
      rejected: candidates.filter(c => c.status === 'rejected').length
    };

    return {
      content: `Summary of your candidate pool:\n\n` +
        `Total Candidates: ${candidates.length}\n` +
        `Average Score: ${avgScore}%\n\n` +
        `Stage Breakdown:\n` +
        `- Applied: ${stageCounts.applied}\n` +
        `- Shortlisted: ${stageCounts.shortlisted}\n` +
        `- Interviewed: ${stageCounts.interviewed}\n` +
        `- Hired: ${stageCounts.hired}\n` +
        `- Rejected: ${stageCounts.rejected}`
    };
  }

  // Default response
  return {
    content: `I can help you with:\n\n` +
      `1. "Show top 5 candidates"\n` +
      `2. "Find candidates with React skills"\n` +
      `3. "Compare candidates"\n` +
      `4. "Show shortlisted candidates"\n` +
      `5. "Give me a summary"\n\n` +
      `What would you like to know?`
  };
}

function extractNumber(query: string): number | null {
  const match = query.match(/\d+/);
  return match ? parseInt(match[0]) : null;
}
