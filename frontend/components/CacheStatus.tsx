import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Database, RefreshCw, Trash2, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import backend from '~backend/client';

export function CacheStatus() {
  const { toast } = useToast();

  const cleanupMutation = useMutation({
    mutationFn: async () => {
      return await backend.accessibot.cleanupCacheEndpoint();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Cache Cleanup Complete",
          description: data.message,
        });
      } else {
        toast({
          title: "Cache Cleanup Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      console.error('Cache cleanup error:', error);
      toast({
        title: "Cache Cleanup Failed",
        description: "Failed to cleanup cache. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCleanupCache = () => {
    cleanupMutation.mutate();
  };

  return (
    <Card className="mb-6 border-dashed">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="w-5 h-5" />
          Cache & Performance Status
        </CardTitle>
        <CardDescription>
          AI fix caching is active to optimize performance and reduce API costs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm">
              <Badge variant="outline" className="text-green-700 border-green-200">
                Cache Active
              </Badge>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Cache TTL: 7 days
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Rate Limit: 50 requests/hour
            </span>
          </div>
          
          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCleanupCache}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cleanup Old Cache
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
