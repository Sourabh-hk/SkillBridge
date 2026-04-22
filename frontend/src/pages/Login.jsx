import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  // If the user was sent here from /join/:token, redirect back after login
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  return (
    <div className="clerk-page">
      <SignIn
        routing="path"
        path="/login"
        forceRedirectUrl={redirect || undefined}
        fallbackRedirectUrl="/dashboard"
        signUpUrl="/signup"
      />
    </div>
  );
}
