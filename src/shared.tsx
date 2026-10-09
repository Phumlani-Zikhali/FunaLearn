import { Link } from "@tanstack/react-router";
import { BookOpen, BookText, Calculator, Leaf, Volume2 } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api } from "./lib/api";
import type { State } from "./lib/types";
export const Context = createContext<{
  s: State;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
}>(null!);
export const useApp = () => useContext(Context);
export const icons: Record<string, typeof Leaf> = {
  "Life Sciences": Leaf,
  Mathematics: Calculator,
  English: BookText,
};
export const Icon = ({ subject }: { subject: string }) => {
  const I = icons[subject] || BookOpen;
  return <I size={25} />;
};
export function A({
  to,
  children,
  className = "",
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link to={to} className={className} activeOptions={{ exact: true }}>
      {children}
    </Link>
  );
}
export function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <BookOpen size={30} />
      <p>{children}</p>
    </div>
  );
}
export function useLoad<T>(url: string) {
  const [value, setValue] = useState<T | null>(null),
    [error, setError] = useState("");
  const load = async () => {
    try {
      setValue(await api<T>(url));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    void load();
  }, [url]);
  return { value, error, load, setValue };
}
export function LoadState({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}) {
  return error ? (
    <div className="error" role="alert">
      {error} <button onClick={retry}>Try again</button>
    </div>
  ) : (
    <div className="loading" role="status">
      Getting your learning ready…
    </div>
  );
}
export function ReadAloud({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false),
    [error, setError] = useState("");
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  return (
    <>
      <button
        onClick={() => {
          if (!("speechSynthesis" in window)) {
            setError("Read aloud is not supported by this browser.");
            return;
          }
          if (speaking) {
            speechSynthesis.cancel();
            setSpeaking(false);
            return;
          }
          const u = new SpeechSynthesisUtterance(text);
          u.rate = 0.85;
          u.onend = () => setSpeaking(false);
          u.onerror = () => {
            setSpeaking(false);
            setError(
              "Your browser could not play this voice. Try again or use your device reader.",
            );
          };
          speechSynthesis.cancel();
          speechSynthesis.speak(u);
          setSpeaking(true);
        }}
      >
        <Volume2 size={18} />
        {speaking ? "Stop reading" : "Read aloud"}
      </button>
      {error && (
        <p role="status" className="small">
          {error}
        </p>
      )}
    </>
  );
}
