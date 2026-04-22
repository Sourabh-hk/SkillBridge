import { SignIn } from "@clerk/clerk-react";

export default function Login() {
  // If the user was sent here from /join/:token, redirect back after login
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-6">
        <SignIn
          routing="path"
          path="/login"
          forceRedirectUrl={redirect || undefined}
          fallbackRedirectUrl="/dashboard"
          signUpUrl="/signup"
        />
      </div>
    </div>
  );
}
