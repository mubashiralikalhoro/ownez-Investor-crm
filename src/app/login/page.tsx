import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-6">
      <div className="w-full max-w-sm space-y-10 text-center">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-navy/60">
            OwnEZ Capital
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-navy">CRM</h1>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
