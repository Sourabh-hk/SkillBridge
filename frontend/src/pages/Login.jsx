import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  return (
    <div className="clerk-page">
      <SignIn
        routing="path"
        path="/login"
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/signup"
      />
    </div>
  );
}
