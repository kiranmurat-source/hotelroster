import { useLanguage, Language } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LanguageToggle = ({ variant = "default" }: { variant?: "default" | "login" }) => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-1 border rounded-lg p-0.5">
      {(["tr", "en"] as Language[]).map((lang) => (
        <Button
          key={lang}
          variant={language === lang ? "secondary" : "ghost"}
          size="sm"
          className={cn("h-7 px-2.5 text-xs font-semibold uppercase", variant === "login" && "h-8 px-3")}
          onClick={() => setLanguage(lang)}
        >
          {lang === "tr" ? "🇹🇷 TR" : "🇬🇧 EN"}
        </Button>
      ))}
    </div>
  );
};

export default LanguageToggle;
