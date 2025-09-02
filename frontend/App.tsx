import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AccessibilityAnalyzer } from './components/AccessibilityAnalyzer';
import { Squares } from '@/components/ui/squares-background';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#060606] relative overflow-hidden">
        <Squares
          direction="diagonal"
          speed={0.4}
          squareSize={40}
          borderColor="#333"
          hoverFillColor="#222"
          className="absolute inset-0 -z-10"
        />
        <AccessibilityAnalyzer />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
