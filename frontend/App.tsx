import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AccessibilityAnalyzer } from './components/AccessibilityAnalyzer';
import { Squares } from '@/components/ui/squares-background';
import backend from '~backend/client';

const queryClient = new QueryClient();

function AppInner() {
  const { data } = useQuery({
    queryKey: ['demo-mode'],
    queryFn: async () => {
      return await backend.accessibot.demoMode();
    },
    staleTime: 60_000,
  });

  const showBanner = !!(data?.demoMode || data?.githubDemo || data?.designToolsDemo);

  return (
    <div className="min-h-screen bg-[#060606] relative overflow-hidden">
      <Squares
        direction="diagonal"
        speed={0.4}
        squareSize={40}
        borderColor="#333"
        hoverFillColor="#222"
        className="absolute inset-0 -z-10"
      />
      {showBanner && (
        <div className="w-full">
          <div className="container mx-auto px-4 pt-4">
            <div className="rounded-md border border-yellow-300 bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800 px-4 py-3 text-sm">
              ⚠️ Running in Demo Mode – AI{data?.githubDemo ? ', GitHub' : ''}{data?.designToolsDemo ? ', and/or Design Tool' : ''} responses are simulated.
            </div>
          </div>
        </div>
      )}
      <AccessibilityAnalyzer />
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
