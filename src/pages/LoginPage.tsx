import { useEffect } from "react";

const LoginPage = () => {
  useEffect(() => {
    // Authelia login sayfasına yönlendir
    window.location.href = `https://auth.khotelpartners.com/?rd=${encodeURIComponent(window.location.origin)}`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Yönlendiriliyor...</p>
    </div>
  );
};

export default LoginPage;
