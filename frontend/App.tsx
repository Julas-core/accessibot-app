import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AccessibilityAnalyzer } from './components/AccessibilityAnalyzer';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <AccessibilityAnalyzer />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}
