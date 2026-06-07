import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div role="alert" className="min-h-dvh flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-foreground">Bir şeyler ters gitti</h1>
          <p className="text-muted-foreground text-sm">
            Beklenmedik bir hata oluştu. Sayfayı yenilemeyi deneyin.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={this.handleReset} variant="outline">Tekrar Dene</Button>
            <Button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground">
              Sayfayı Yenile
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
