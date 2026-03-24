import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequestJson } from '@/lib/queryClient';
import { Brain, Mic, Users, Zap } from 'lucide-react';

export default function QuickTest() {
  const [selectedLanguage, setSelectedLanguage] = useState('Spanish');
  const { toast } = useToast();

  const quickTests = [
    {
      name: 'Vocabulary Generation',
      icon: Brain,
      mutation: useMutation({
        mutationFn: () => apiRequestJson<unknown>('POST', '/api/ai/vocabulary', {
          language: selectedLanguage,
          theme: 'technology',
          level: 'intermediate',
          count: 3
        }),
        onSuccess: () => toast({ title: "Vocabulary generated", description: "3 tech words created" })
      })
    },
    {
      name: 'Grammar Explanation',
      icon: Users,
      mutation: useMutation({
        mutationFn: () => apiRequestJson<unknown>('POST', '/api/ai/grammar', {
          language: selectedLanguage,
          topic: 'subjunctive mood',
          level: 'advanced'
        }),
        onSuccess: () => toast({ title: "Grammar explained", description: "Advanced concept breakdown ready" })
      })
    },
    {
      name: 'Voice Conversation',
      icon: Mic,
      mutation: useMutation({
        mutationFn: () => apiRequestJson<unknown>('POST', '/api/ai/voice/conversation/start', {
          languageId: 1,
          topic: 'job interview',
          level: 'advanced'
        }),
        onSuccess: () => toast({ title: "Conversation started", description: "AI tutor ready for practice" })
      })
    },
    {
      name: 'Cultural Content',
      icon: Zap,
      mutation: useMutation({
        mutationFn: () => apiRequestJson<unknown>('POST', '/api/ai/cultural-content', {
          language: selectedLanguage,
          topic: 'business etiquette',
          level: 'professional'
        }),
        onSuccess: () => toast({ title: "Cultural insights ready", description: "Business etiquette guide created" })
      })
    }
  ];

  const runAllTests = () => {
    quickTests.forEach(test => {
      setTimeout(() => test.mutation.mutate(), Math.random() * 2000);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick AI Test Suite</CardTitle>
        <CardDescription>Rapid testing of core AI capabilities</CardDescription>
        <div className="flex gap-2">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Spanish">Spanish</SelectItem>
              <SelectItem value="French">French</SelectItem>
              <SelectItem value="German">German</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={runAllTests} size="sm">Run All Tests</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickTests.map((test, i) => {
            const Icon = test.icon;
            return (
              <Button
                key={i}
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => test.mutation.mutate()}
                disabled={test.mutation.isPending}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs">{test.name}</span>
                {test.mutation.isSuccess && <Badge variant="default" className="text-xs">✓</Badge>}
                {test.mutation.isPending && <Badge variant="secondary" className="text-xs">...</Badge>}
              </Button>
            );
          })}
        </div>
        
        {quickTests.some(test => test.mutation.data) && (
          <ScrollArea className="h-32 mt-4 border rounded p-2">
            <div className="space-y-2 text-xs">
              {quickTests.map((test, i) => {
                if (test.mutation.data === undefined || test.mutation.data === null) {
                  return null;
                }

                const serialized = typeof test.mutation.data === "string"
                  ? test.mutation.data
                  : JSON.stringify(test.mutation.data);

                return (
                  <div key={i} className="flex items-center gap-2">
                    <Badge variant="outline">{test.name}</Badge>
                    <span className="text-muted-foreground">
                      {(serialized ?? String(test.mutation.data)).substring(0, 40) + "..."}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
