import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import * as ipc from "../../lib/ipc";

interface UrlMeta {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
}

// Simple cache to avoid re-fetching
const metaCache = new Map<string, UrlMeta | null>();

export default function LinkPreview({ url }: { url: string }) {
  const [meta, setMeta] = useState<UrlMeta | null>(metaCache.get(url) ?? null);
  const [loaded, setLoaded] = useState(metaCache.has(url));

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    ipc.fetchUrlMeta(url).then((m) => {
      if (cancelled) return;
      metaCache.set(url, m);
      setMeta(m);
      setLoaded(true);
    }).catch(() => {
      metaCache.set(url, null);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [url, loaded]);

  if (!loaded || !meta || (!meta.title && !meta.description)) return null;

  const handleClick = () => {
    window.open(url, "_blank");
  };

  return (
    <div
      onClick={handleClick}
      className="mt-1.5 border border-border/60 rounded-lg overflow-hidden cursor-pointer
                 hover:border-accent/40 transition-colors bg-warm-50/50 max-w-[320px]"
    >
      {meta.image && (
        <div className="h-32 overflow-hidden bg-warm-100">
          <img src={meta.image} alt="" className="w-full h-full object-cover"
               onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
      )}
      <div className="px-3 py-2">
        {meta.site_name && (
          <p className="text-xs text-text-hint mb-0.5 flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            {meta.site_name}
          </p>
        )}
        {meta.title && (
          <p className="text-xs font-medium text-text-primary line-clamp-2">{meta.title}</p>
        )}
        {meta.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{meta.description}</p>
        )}
      </div>
    </div>
  );
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

export function extractUrls(text: string): string[] {
  return [...text.matchAll(URL_REGEX)].map((m) => m[0]);
}
