"use client"

import { useEffect, useState, useRef } from "react"

const TERMINAL_LINES = [
  { type: "command", text: "$ connect riverside_county_dispatch", delay: 0 },
  { type: "success", text: "[CONNECTED] Establishing secure tunnel...", delay: 500 },
  { type: "command", text: "$ auth --badge 7734 --clearance LEVEL_5", delay: 800 },
  { type: "info", text: "Authentication successful. Welcome Officer.", delay: 1200 },
  { type: "command", text: "$ query_incidents --realtime --priority HIGH", delay: 1600 },
  { type: "info", text: "Scanning dispatch frequencies...", delay: 2000 },
  { type: "data", text: ">> Found 147 active channels", delay: 2400 },
  { type: "command", text: "$ run criminal_background_check --batch", delay: 2800 },
  { type: "process", text: "Processing: John Doe (DOB: 1985-03-15)", delay: 3200 },
  { type: "data", text: "└─ Priors: 2x DUI, 1x Assault", delay: 3400 },
  { type: "process", text: "Processing: Jane Smith (DOB: 1992-07-22)", delay: 3600 },
  { type: "data", text: "└─ Clean record", delay: 3800 },
  { type: "command", text: "$ triangulate --cell_towers --accuracy HIGH", delay: 4200 },
  { type: "info", text: "Pinging tower ID: RCTW-0947...", delay: 4600 },
  { type: "data", text: "Signal strength: -67 dBm", delay: 4800 },
  { type: "command", text: "$ access ncic_database --mode READ_ONLY", delay: 5200 },
  { type: "warning", text: "[WARNING] Activity logged to audit trail", delay: 5600 },
  { type: "command", text: "$ scan license_plates --radius 5mi", delay: 6000 },
  { type: "data", text: "ALPR hit: 7ABC123 - Stolen vehicle", delay: 6400 },
  { type: "command", text: "$ monitor radio_traffic --filter PRIORITY", delay: 6800 },
  { type: "info", text: "Decrypting encrypted channels...", delay: 7200 },
  { type: "command", text: "$ cross_reference warrants --status ACTIVE", delay: 7600 },
  { type: "data", text: "Found 23 active warrants in area", delay: 8000 },
  { type: "command", text: "$ satellite_view --enhance --zoom 18", delay: 8400 },
  { type: "process", text: "Downloading imagery from SENTINEL-2...", delay: 8800 },
  { type: "command", text: "$ facial_recognition --database STATE_DMV", delay: 9200 },
  { type: "info", text: "Analyzing biometric data...", delay: 9600 },
  { type: "command", text: "$ compile incident_report --format JSON", delay: 10000 },
  { type: "success", text: "[COMPLETE] Data synchronized", delay: 10400 }
];

export default function TerminalLoading() {
  const [displayedLines, setDisplayedLines] = useState<Array<{ type: string; text: string; typed: string }>>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const typeCharacter = () => {
      const elapsed = Date.now() - startTimeRef.current;

      // Find which line should be displayed based on elapsed time
      let lineToShow = -1;
      for (let i = 0; i <= currentLineIndex && i < TERMINAL_LINES.length; i++) {
        if (elapsed >= TERMINAL_LINES[i].delay) {
          lineToShow = i;
        }
      }

      if (lineToShow > currentLineIndex) {
        // Start a new line
        setCurrentLineIndex(lineToShow);
        setCurrentCharIndex(0);
        setDisplayedLines(prev => [...prev, {
          type: TERMINAL_LINES[lineToShow].type,
          text: TERMINAL_LINES[lineToShow].text,
          typed: ""
        }]);
      } else if (lineToShow === currentLineIndex && currentCharIndex < TERMINAL_LINES[lineToShow].text.length) {
        // Type the current line
        setDisplayedLines(prev => {
          const newLines = [...prev];
          if (newLines[lineToShow]) {
            newLines[lineToShow].typed = TERMINAL_LINES[lineToShow].text.substring(0, currentCharIndex + 1);
          }
          return newLines;
        });
        setCurrentCharIndex(prev => prev + 1);
      } else if (currentLineIndex >= TERMINAL_LINES.length - 1 && currentCharIndex >= TERMINAL_LINES[currentLineIndex].text.length) {
        // Reset and loop
        startTimeRef.current = Date.now();
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
      }
    };

    const timer = setInterval(typeCharacter, 30); // Typing speed

    return () => clearInterval(timer);
  }, [currentLineIndex, currentCharIndex]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLines]);

  const getLineColor = (type: string) => {
    switch (type) {
      case "command": return "text-green-400";
      case "success": return "text-green-300";
      case "info": return "text-green-500";
      case "data": return "text-green-600";
      case "process": return "text-green-400";
      case "warning": return "text-yellow-400";
      default: return "text-green-400";
    }
  };

  return (
    <div className="absolute inset-0 z-[60] bg-black flex flex-col">
      {/* Scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 0, 0.03) 2px,
            rgba(0, 255, 0, 0.03) 4px
          )`,
          animation: "scanline 8s linear infinite"
        }}
      />

      {/* Terminal header bar */}
      <div className="bg-black border-b border-green-500/20 px-6 py-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <span className="text-green-400 font-mono text-xs tracking-wider">
            RIVERSIDE COUNTY DISPATCH SYSTEM v2.7.1
          </span>
        </div>
        <div className="flex items-center gap-2 text-green-400 font-mono text-xs">
          <span>[SECURE]</span>
          <span className="animate-pulse">●</span>
        </div>
      </div>

      {/* Terminal body - full screen */}
      <div
        ref={containerRef}
        className="flex-1 bg-black overflow-y-auto overflow-x-hidden font-mono text-sm px-6 py-4"
        style={{
          textShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
          filter: "contrast(1.3) brightness(1.2)"
        }}
      >
        {displayedLines.map((line, index) => (
          <div
            key={index}
            className={`mb-1 ${getLineColor(line.type)}`}
            style={{
              animation: index === displayedLines.length - 1 ? "glow 0.3s ease-out" : undefined
            }}
          >
            <span>{line.typed}</span>
            {index === displayedLines.length - 1 && line.typed.length < line.text.length && (
              <span className="inline-block w-2 h-4 bg-green-400 ml-0.5" style={{
                animation: "blink 1s infinite"
              }} />
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes scanline {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(4px);
          }
        }

        @keyframes glow {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }

        @keyframes blink {
          0%, 49% {
            opacity: 1;
          }
          50%, 100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}