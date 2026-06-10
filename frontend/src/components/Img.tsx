import { useState } from "react";

interface ImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

export function Img({ className = "", wrapperClassName = "", alt = "", ...props }: ImgProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {status === "loading" && (
        <div className="absolute inset-0 animate-shimmer" aria-hidden="true" />
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-raised" aria-hidden="true">
          <svg className="size-6 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </div>
      )}
      <img
        decoding="async"
        {...props}
        alt={alt}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={`transition-opacity duration-300 ${status === "loaded" ? "opacity-100" : "opacity-0"} ${className}`}
      />
    </div>
  );
}
