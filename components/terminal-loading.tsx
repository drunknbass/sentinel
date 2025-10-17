"use client"

import { useEffect, useState, useRef } from "react"

const TERMINAL_LINES = [
  "root@dispatch:~# systemctl start riverside-dispatch.service",
  "[  OK  ] Started Riverside County Dispatch Service",
  "root@dispatch:~# cat /etc/dispatch/config.yml | grep priority",
  "  min_priority: 10",
  "  max_priority: 100",
  "  auto_escalate: true",
  "root@dispatch:~# nmap -sS -p 8080,443,22 dispatch.riverside.gov",
  "Starting Nmap 7.94 scan...",
  "PORT     STATE SERVICE",
  "22/tcp   open  ssh",
  "443/tcp  open  https",
  "8080/tcp open  http-proxy",
  "root@dispatch:~# curl -X POST https://api.ncic.fbi.gov/v3/query -H 'Auth: Bearer ***'",
  '{"status": "authenticated", "access_level": 5, "clearance": "TOP_SECRET"}',
  "root@dispatch:~# tail -f /var/log/dispatch/incidents.log",
  "[2025-10-17 01:45:23] NEW: 211 IN PROGRESS - 4TH ST & MAIN",
  "[2025-10-17 01:45:24] PRIORITY: HIGH",
  "[2025-10-17 01:45:25] UNITS DISPATCHED: 3-ADAM-12, 1-ADAM-20",
  "[2025-10-17 01:45:26] ETA: 3 MINUTES",
  "root@dispatch:~# python3 /opt/scripts/criminal_lookup.py --ssn ***-**-1234",
  "Querying NCIC database...",
  "Subject: John Doe",
  "DOB: 1985-03-15",
  "Priors: 2x DUI (2019, 2021), 1x Assault (2022)",
  "Warrants: NONE ACTIVE",
  "root@dispatch:~# ./alpr_scan --radius 5mi --realtime",
  "Initializing ALPR system...",
  "Camera feeds: 247 active",
  "Recognition rate: 97.3%",
  "Processing...",
  "ALERT: Stolen vehicle detected - CA 7ABC123",
  "Location: Main St & 5th Ave",
  "root@dispatch:~# ssh tower-01.riverside.gov 'grep HIGH /var/log/priority.log | wc -l'",
  "47",
  "root@dispatch:~# redis-cli HGETALL active_incidents",
  "1) incident_2025102",
  "2) {type: 'ROBBERY', priority: 10, units: 3}",
  "3) incident_2025103",
  "4) {type: 'DUI', priority: 50, units: 1}",
  "root@dispatch:~# docker exec dispatch-db psql -c 'SELECT COUNT(*) FROM incidents WHERE received_at > NOW() - INTERVAL \"2 hours\"'",
  " count ",
  "-------",
  "   89  ",
  "(1 row)",
  "root@dispatch:~# grep 'CRITICAL' /var/log/syslog | head -3",
  "Oct 17 01:40:12 dispatch kernel: CRITICAL: High priority dispatch",
  "Oct 17 01:42:33 dispatch daemon: CRITICAL: All units respond",
  "Oct 17 01:44:55 dispatch alert: CRITICAL: Officer needs assistance",
  "root@dispatch:~# netstat -tulpn | grep LISTEN",
  "tcp   0   0 0.0.0.0:443    0.0.0.0:*   LISTEN   2847/nginx",
  "tcp   0   0 0.0.0.0:8080   0.0.0.0:*   LISTEN   3921/dispatch",
  "tcp   0   0 0.0.0.0:5432   0.0.0.0:*   LISTEN   1247/postgres",
  "root@dispatch:~# cat /proc/meminfo | grep MemAvailable",
  "MemAvailable:   12485632 kB",
  "root@dispatch:~# tcpdump -i eth0 -c 5 'port 443'",
  "01:45:27.123456 IP client.42358 > dispatch.443: Flags [S]",
  "01:45:27.123789 IP dispatch.443 > client.42358: Flags [S.]",
  "01:45:27.124012 IP client.42358 > dispatch.443: Flags [.]",
  "01:45:27.124234 IP client.42358 > dispatch.443: Flags [P.]",
  "01:45:27.124567 IP dispatch.443 > client.42358: Flags [P.]",
  "root@dispatch:~# watch -n 1 'echo Active: $(redis-cli get incident_count)'",
];

export default function TerminalLoading() {
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const typeCharacter = () => {
      if (currentLineIndex < TERMINAL_LINES.length) {
        const currentLine = TERMINAL_LINES[currentLineIndex];

        if (currentCharIndex < currentLine.length) {
          // Add one character at a time
          setLines(prev => {
            const newLines = [...prev];
            if (newLines.length === currentLineIndex) {
              newLines.push('');
            }
            newLines[currentLineIndex] = currentLine.substring(0, currentCharIndex + 1);
            return newLines;
          });
          setCurrentCharIndex(prev => prev + 1);
        } else {
          // Move to next line
          setCurrentLineIndex(prev => prev + 1);
          setCurrentCharIndex(0);
        }
      } else {
        // Loop back to beginning
        setLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
      }
    };

    const timer = setInterval(typeCharacter, 15); // Fast typing speed for hacker effect
    return () => clearInterval(timer);
  }, [currentLineIndex, currentCharIndex]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const getLineColor = (line: string) => {
    if (line.startsWith('root@dispatch:~#')) return 'text-green-400';
    if (line.startsWith('[') && line.includes('OK')) return 'text-green-300';
    if (line.includes('ALERT') || line.includes('CRITICAL')) return 'text-red-400';
    if (line.includes('HIGH') || line.includes('WARNING')) return 'text-yellow-400';
    if (line.startsWith('{') || line.startsWith('"')) return 'text-blue-400';
    return 'text-green-500';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* CRT scanline effect */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 0, 0.05) 2px,
            rgba(0, 255, 0, 0.05) 4px
          )`,
          animation: "scanline 8s linear infinite"
        }}
      />

      {/* Terminal content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-xs sm:text-sm"
        style={{
          textShadow: "0 0 10px rgba(0, 255, 0, 0.8)",
          filter: "contrast(1.4) brightness(1.3)"
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className={`${getLineColor(line)} whitespace-pre-wrap break-all`}
            style={{
              animation: index === lines.length - 1 ? "glow 0.1s ease-out" : undefined
            }}
          >
            {line}
            {index === lines.length - 1 && currentCharIndex < TERMINAL_LINES[currentLineIndex]?.length && (
              <span className="inline-block w-2 h-4 bg-green-400 ml-0.5 animate-pulse" />
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
            opacity: 0.6;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}