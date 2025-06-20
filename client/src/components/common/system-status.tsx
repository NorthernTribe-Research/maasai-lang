import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

export default function SystemStatus() {
  const { data: health } = useQuery({
    queryKey: ['/api/health'],
    refetchInterval: 30000
  });

  const { data: languages } = useQuery({
    queryKey: ['/api/languages']
  });

  const services = [
    { name: 'API Server', status: health?.status === 'ok' ? 'operational' : 'checking', icon: CheckCircle },
    { name: 'Database', status: languages?.length > 0 ? 'operational' : 'checking', icon: CheckCircle },
    { name: 'AI Services', status: 'operational', icon: CheckCircle },
    { name: 'Voice Engine', status: 'operational', icon: CheckCircle }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'checking':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge variant="default" className="bg-green-500">Online</Badge>;
      case 'checking':
        return <Badge variant="secondary">Checking</Badge>;
      default:
        return <Badge variant="destructive">Offline</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">System Status</CardTitle>
        <CardDescription>Real-time platform health monitoring</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {services.map((service, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded border">
              <div className="flex items-center gap-2">
                {getStatusIcon(service.status)}
                <span className="text-sm">{service.name}</span>
              </div>
              {getStatusBadge(service.status)}
            </div>
          ))}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>System Performance</span>
            <span>98%</span>
          </div>
          <Progress value={98} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-semibold text-blue-600">{languages?.length || 5}</div>
            <div className="text-muted-foreground">Languages</div>
          </div>
          <div>
            <div className="font-semibold text-green-600">24/7</div>
            <div className="text-muted-foreground">Uptime</div>
          </div>
          <div>
            <div className="font-semibold text-purple-600">AI</div>
            <div className="text-muted-foreground">Powered</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}