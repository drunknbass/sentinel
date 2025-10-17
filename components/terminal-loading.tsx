"use client"

import { useEffect, useState, useRef } from "react"

const TERMINAL_LINES = [
  "> login badge:7734",
  "RIVERSIDE COUNTY SHERIFF DISPATCH SYSTEM v4.2",
  "Authentication successful. Welcome Officer Martinez",
  "Last login: 2025-10-17 01:42:33 from unit 3-ADAM-12",
  "",
  "> run_plate CA 7ABC123",
  "Running plate CA 7ABC123...",
  "===============================================",
  "Vehicle Registration Check",
  "Plate: CA 7ABC123",
  "Make: Honda",
  "Model: Civic",
  "Year: 2019",
  "Color: Black",
  "VIN: 1HGBH41JXMN109876",
  "Registered Owner: JOHNSON, MICHAEL A",
  "Address: 1847 Oak Street, Riverside CA 92501",
  "STATUS: **STOLEN** - Reported 10/15/2025",
  "===============================================",
  "",
  "> lookup_subject johnson_michael_a",
  "Searching NCIC database...",
  "Subject Found:",
  "Name: JOHNSON, MICHAEL ANTHONY",
  "DOB: 03/15/1985",
  "DL#: B2847563",
  "Height: 5'11\"",
  "Weight: 180 lbs",
  "Hair: Brown",
  "Eyes: Blue",
  "",
  "Criminal History:",
  "- 2019: DUI - CONVICTED",
  "- 2021: DUI 2nd - CONVICTED",
  "- 2022: Assault & Battery - CONVICTED",
  "- 2023: Possession of Controlled Substance - DISMISSED",
  "",
  "**ACTIVE WARRANT**",
  "Case #: 2025-CR-00847",
  "Charge: Failure to Appear",
  "Bail: $15,000",
  "Issued: 09/22/2025",
  "",
  "> check_wants_warrants johnson_michael 03/15/1985",
  "CAUTION: Subject has history of violence",
  "CAUTION: Subject known to carry weapons",
  "Approach with backup recommended",
  "",
  "> run_plate CA 5XYZ789",
  "Running plate CA 5XYZ789...",
  "Vehicle: 2022 Ford F-150",
  "Owner: SMITH, JENNIFER L",
  "Status: CLEAR - No wants/warrants",
  "",
  "> lookup_dl B9876543",
  "Driver License Check:",
  "Name: RODRIGUEZ, CARLOS",
  "Status: SUSPENDED - DUI",
  "Suspension Date: 08/14/2025",
  "Eligible for Reinstatement: 02/14/2026",
  "",
  "> scan_area --radius 1mi",
  "Scanning for recent incidents within 1 mile...",
  "3 incidents found:",
  "1. 211 in progress - 4th & Main (0.3 mi)",
  "2. Traffic collision - Hwy 91 & Tyler (0.7 mi)",
  "3. Domestic disturbance - 1200 block Maple (0.9 mi)",
  "",
  "> run_plate TX 8DEF234",
  "Running plate TX 8DEF234...",
  "Out of state plate detected",
  "Vehicle: 2020 Chevrolet Tahoe",
  "Owner: WILLIAMS, DAVID R",
  "Texas DL: 48572938",
  "No local warrants",
  "NCIC Check: CLEAR",
  "",
  "> lookup_address 1847_oak_street",
  "Property Information:",
  "1847 Oak Street, Riverside CA",
  "Resident: JOHNSON, MICHAEL A",
  "Previous Calls:",
  "- 10/02/2025: Noise complaint",
  "- 09/15/2025: Domestic disturbance",
  "- 08/28/2025: Welfare check",
  "Known Associates at Address:",
  "- JOHNSON, SARAH M (spouse)",
  "- JOHNSON, TYLER M (son, age 17)",
  "",
  "> check_probation johnson_michael",
  "Probation Status Check:",
  "Subject: JOHNSON, MICHAEL A",
  "Status: ACTIVE PROBATION",
  "Probation Officer: Det. K. Thompson",
  "Requirements:",
  "- Weekly check-ins",
  "- Random drug testing",
  "- No alcohol consumption",
  "Last Test: 10/10/2025 - FAILED (alcohol detected)",
  "**PROBATION VIOLATION ALERT**",
  "",
  "> unit_status",
  "Active Units in Area:",
  "3-ADAM-12: Code 6 - Traffic stop",
  "1-ADAM-20: En route to 211",
  "2-ADAM-15: Available",
  "K9-UNIT-1: 10-8 (In service)",
  "",
  "> run_plate CA 3ABC456",
  "Running plate CA 3ABC456...",
  "Vehicle: 2018 Toyota Camry",
  "Owner: CHEN, LISA M",
  "Status: EXPIRED REGISTRATION (30 days overdue)",
  "",
  "> dispatch --priority HIGH",
  "All units: Be on lookout for black Honda Civic",
  "Plate: CA 7ABC123",
  "Armed and dangerous suspect",
  "Last seen: Main St heading northbound",
  "Units responding: 3-ADAM-12, 2-ADAM-15, K9-1",
  "",
  "> status_update",
  "Syncing with dispatch...",
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
          // Move to next line with a small delay for empty lines
          setTimeout(() => {
            setCurrentLineIndex(prev => prev + 1);
            setCurrentCharIndex(0);
          }, currentLine === "" ? 100 : 0);
        }
      } else {
        // Loop back to beginning
        setTimeout(() => {
          setLines([]);
          setCurrentLineIndex(0);
          setCurrentCharIndex(0);
        }, 1000);
      }
    };

    const timer = setInterval(typeCharacter, 20); // Typing speed
    return () => clearInterval(timer);
  }, [currentLineIndex, currentCharIndex]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  const getLineColor = (line: string) => {
    // Commands
    if (line.startsWith('>')) return 'text-green-400';

    // Headers and system messages
    if (line.includes('RIVERSIDE COUNTY') || line.includes('===============')) return 'text-green-300';

    // Alerts and warnings
    if (line.includes('**STOLEN**') || line.includes('**ACTIVE WARRANT**') || line.includes('**PROBATION VIOLATION')) return 'text-red-500 font-bold animate-pulse';
    if (line.includes('CAUTION:')) return 'text-yellow-400 font-bold';

    // Status messages
    if (line.includes('STATUS:') || line.includes('Status:')) return 'text-blue-400';
    if (line.includes('CLEAR')) return 'text-green-400';
    if (line.includes('SUSPENDED') || line.includes('FAILED')) return 'text-orange-400';

    // Field labels
    if (line.includes(':') && !line.startsWith('-')) {
      const beforeColon = line.split(':')[0];
      if (beforeColon.length < 20) return 'text-cyan-400';
    }

    // Criminal history items
    if (line.startsWith('-')) return 'text-yellow-300';

    // Default
    return 'text-green-500';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* CRT scanline effect */}
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

      {/* Terminal header */}
      <div className="bg-green-900/20 border-b border-green-500/30 px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-green-400 font-mono text-xs tracking-wider">
            MDT-3A12 | RIVERSIDE COUNTY SHERIFF | UNIT 3-ADAM-12
          </span>
          <span className="text-green-400 font-mono text-xs animate-pulse">
            ● CONNECTED
          </span>
        </div>
      </div>

      {/* Terminal content */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 font-mono text-xs sm:text-sm"
        style={{
          textShadow: "0 0 8px rgba(0, 255, 0, 0.5)",
          filter: "contrast(1.2) brightness(1.1)",
          fontFamily: "'Courier New', monospace"
        }}
      >
        {lines.map((line, index) => (
          <div
            key={index}
            className={`${getLineColor(line)} whitespace-pre-wrap`}
            style={{
              animation: index === lines.length - 1 && line.length > 0 ? "glow 0.1s ease-out" : undefined
            }}
          >
            {line}
            {index === lines.length - 1 && currentCharIndex < TERMINAL_LINES[currentLineIndex]?.length && (
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
            opacity: 0.7;
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