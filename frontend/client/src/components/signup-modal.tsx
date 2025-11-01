import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface SignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignupModal({ open, onOpenChange }: SignupModalProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [apiKey, setApiKey] = useState("");
  const { toast } = useToast();

  const signupMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest(
        "POST",
        "/api/auth/signup",
        data
      ) as Promise<{ user: { id: string; email: string; name: string }; apiKey: string }>;
    },
    onSuccess: (data) => {
      setApiKey(data.apiKey);
      toast({
        title: "Success!",
        description: "Your account has been created. Save your API key below.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest(
        "POST",
        "/api/auth/login",
        data
      ) as Promise<{ user: { id: string; email: string; name: string } }>;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've been logged in successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      loginMutation.mutate({ email: formData.email, password: formData.password });
    } else {
      signupMutation.mutate(formData);
    }
  };

  const isPending = signupMutation.isPending || loginMutation.isPending;

  if (apiKey) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-api-key-success">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Your API Key</DialogTitle>
            <DialogDescription>
              Save this key safely. You won't be able to see it again!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-black/95 p-4 rounded-md border-2 border-neon-green">
              <code className="text-neon-green font-mono text-sm break-all" data-testid="text-api-key">
                {apiKey}
              </code>
            </div>
            <Button
              className="w-full bg-neon-green text-black border-neon-green font-bold"
              onClick={() => {
                navigator.clipboard.writeText(apiKey);
                toast({ title: "Copied!", description: "API key copied to clipboard" });
              }}
              data-testid="button-copy-key"
            >
              Copy API Key
            </Button>
            <Button
              variant="outline"
              className="w-full border-2 border-neon-green text-black"
              onClick={() => {
                onOpenChange(false);
                setApiKey("");
                setFormData({ name: "", email: "", password: "" });
              }}
              data-testid="button-close-modal"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-signup">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            {isLogin ? "Welcome Back" : "Get Started Free"}
          </DialogTitle>
          <DialogDescription>
            {isLogin ? "Sign in to your account" : "1,000 free verifications. No credit card required."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required={!isLogin}
                data-testid="input-name"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              data-testid="input-password"
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-neon-green text-black border-neon-green font-bold"
            disabled={isPending}
            data-testid="button-submit"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isLogin ? "Sign In" : "Create Account"}
          </Button>
          <button
            type="button"
            className="w-full text-sm text-black/60 hover:text-neon-green transition-colors"
            onClick={() => setIsLogin(!isLogin)}
            data-testid="button-toggle-mode"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
