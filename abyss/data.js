// Portfolio content. Edit here; the page renders from this file.
export const FEATURED = ["AgentKit","Helpy","Yankit","wimys_crumb","term-rest-client","ANIMATRON","ReelForge","sandkit"];

export const PROJECTS = [
  {
    "name": "AgentKit",
    "meta": "Agent Runtime SDK · TypeScript",
    "priv": true,
    "soon": true,
    "site": {
      "href": "agentkit/",
      "label": "Visit the site"
    },
    "docs": {
      "href": "agentkit/docs/getting-started/",
      "label": "Read the docs"
    },
    "link": {
      "href": "agentkit/#tour",
      "label": "Watch the 40 second tour"
    },
    "desc": "A config-first headless agent runtime for TypeScript, being prepared for an open-source release under the MIT licence. Multi-provider with mid-session model hot-swapping, full MCP support over stdio and HTTP, human-in-the-loop plan mode and approval gates, and a record-and-replay harness so agent behaviour is tested deterministically in CI with no API keys and no spend.",
    "tech": [
      "TypeScript",
      "Node.js",
      "MCP",
      "Zod",
      "Turborepo",
      "SSE"
    ],
    "fit": true,
    "shots": [
      "shots/agentkit/tour-poster.jpg",
      "shots/agentkit/banner.svg",
      "shots/agentkit/architecture.svg"
    ]
  },
  {
    "name": "Helpy",
    "meta": "AI Desktop Companion · Tauri + Rust",
    "repo": "https://github.com/AbyAbyss/helpy",
    "site": {
      "href": "helpy/",
      "label": "Visit the site"
    },
    "link": {
      "href": "helpy/#tour",
      "label": "Watch the 45 second tour"
    },
    "desc": "An AI companion that lives next to your cursor. Ask out loud and it looks at your screen, then highlights the real button, draws arrows and lines over your apps, and walks you through step by step. Say a task and it plans background agents, asks before anything risky, and can undo every file change. Works with Anthropic, OpenAI, Gemini or a local model, on macOS, Windows and Linux. Open source: the code is public, there are no prebuilt installers yet, and you build it from source with your own model key.",
    "tech": [
      "Rust",
      "Tauri",
      "React",
      "TypeScript",
      "MCP",
      "Whisper"
    ],
    "shots": [
      "shots/helpy/notch.png",
      "shots/helpy/hero.jpg",
      "shots/helpy/walkthrough.png",
      "shots/helpy/plan-card.png",
      "shots/helpy/card-dark.png"
    ]
  },
  {
    "name": "ffmpeg-mcp",
    "meta": "MCP Video Editor · Python",
    "repo": "https://github.com/AbyAbyss/ffmpeg-mcp-video-editor",
    "desc": "Gives any MCP client a real video editor: 38 typed tools over ffmpeg, Whisper and MediaPipe instead of a shell escape hatch. Non-blocking jobs with real ffmpeg progress and working cancel, face-tracked landscape-to-vertical reframing, word-level auto-captioning, and whole-timeline renders in a single pass. 727 tests, and the unit suite runs with no ffmpeg installed.",
    "tech": [
      "Python",
      "MCP",
      "FFmpeg",
      "Whisper",
      "OpenCV"
    ],
    "fit": true,
    "shots": [
      "https://raw.githubusercontent.com/AbyAbyss/ffmpeg-mcp-video-editor/main/docs/banner.svg",
      "https://raw.githubusercontent.com/AbyAbyss/ffmpeg-mcp-video-editor/main/docs/reframe.svg",
      "https://raw.githubusercontent.com/AbyAbyss/ffmpeg-mcp-video-editor/main/docs/architecture.svg"
    ]
  },
  {
    "name": "redis_gui",
    "meta": "Redis Client · Go + React",
    "repo": "https://github.com/AbyAbyss/redis_gui",
    "site": {
      "href": "redis_gui",
      "label": "Visit the site"
    },
    "desc": "A full Redis GUI that ships as one static Go binary and runs as a local web app, a native desktop app, or headless in Docker. SCAN keyspace browser with per-type viewers, 1 Hz metrics, a coalesced MONITOR stream and a memory analyzer over WebSocket, plus RBAC, an audit log and AES-256-GCM encrypted credentials.",
    "tech": [
      "Go",
      "Redis",
      "React",
      "TypeScript",
      "WebSockets",
      "SQLite"
    ],
    "shots": [
      "assets/redis_gui/keyspace.webp",
      "assets/redis_gui/workbench.webp",
      "assets/redis_gui/cli.webp",
      "assets/redis_gui/monitor.webp",
      "assets/redis_gui/metrics.webp",
      "assets/redis_gui/memory.webp"
    ]
  },
  {
    "name": "term-rest-client",
    "meta": "API Client · Go TUI + Web",
    "repo": "https://github.com/AbyAbyss/cli-rest-client",
    "site": {
      "href": "term-rest-client",
      "label": "Visit the site"
    },
    "desc": "An API client for REST, GraphQL, Server-Sent Events and WebSocket, run as rest in the terminal or, with rest -gui, in the browser (requests still run in Go, so no CORS). Collections with nested folders, environments, history, one-line tests and pre-request scripts, Postman and cURL import and export, code snippets in five languages, and load testing with ramping virtual users, live charts and pass/fail thresholds. One static Go binary that also fails CI when a test or threshold fails.",
    "tech": [
      "Go",
      "tview",
      "tcell",
      "GraphQL",
      "WebSocket",
      "Load testing",
      "Vanilla JS",
      "Playwright"
    ],
    "shots": [
      "assets/term-rest-client/main.webp",
      "assets/term-rest-client/gui.webp",
      "assets/term-rest-client/gui-load.webp",
      "assets/term-rest-client/graphql-schema.webp",
      "assets/term-rest-client/streaming.webp",
      "assets/term-rest-client/websocket.webp",
      "assets/term-rest-client/loadtest.webp",
      "assets/term-rest-client/code.webp"
    ]
  },
  {
    "name": "ANIMATRON",
    "meta": "Animation Studio · React",
    "priv": true,
    "link": {
      "href": "animator/",
      "label": "Open the live app"
    },
    "desc": "A browser-based SVG character animation studio: rig characters, animate them on a multi-track timeline, sync lips to audio and export, with no install and no server. Anatomically pivoted joint rigs, RMS-driven auto lip sync, deterministic particle effects, and an AI co-pilot whose output is validated against the renderer's real enums so it can never corrupt undo/redo.",
    "tech": [
      "React",
      "TypeScript",
      "SVG",
      "Web Audio",
      "Zustand",
      "Claude + GPT-4o"
    ],
    "shots": [
      "shots/animator/editor.png",
      "shots/animator/ai-critic.png",
      "shots/animator/effects.png",
      "shots/animator/architecture.svg"
    ]
  },
  {
    "name": "ReelForge",
    "meta": "AI Video Generator · Python",
    "priv": true,
    "desc": "A local-first AI faceless-video generator: a topic, story or script becomes a scene plan, visuals, narration, word-timed captions and a finished 1080×1920 MP4. Clip mode turns one long video into several shorts using local Whisper, LLM-picked moments snapped to speech boundaries, and a 9:16 crop centred on the speaker via median-of-12-frames YuNet face detection.",
    "tech": [
      "Python",
      "FastAPI",
      "Next.js",
      "FFmpeg",
      "Whisper",
      "OpenCV"
    ],
    "shots": [
      "shots/reelforge/create-topic.png",
      "shots/reelforge/editor.png",
      "shots/reelforge/clip-real-footage.jpg",
      "shots/reelforge/clip-face-crop.jpg",
      "shots/reelforge/create-ideas.png",
      "shots/reelforge/library.png",
      "shots/reelforge/upload.png"
    ]
  },
  {
    "name": "dockman",
    "meta": "Docker Manager · Tauri",
    "repo": "https://github.com/AbyAbyss/dockman",
    "site": {
      "href": "dockman",
      "label": "Visit the site"
    },
    "desc": "A native desktop app that drives Docker and Podman side by side from one window: containers, images, volumes, networks, builds and the runtime binaries themselves. An interactive shell into any running container, a network topology map with live bandwidth, a build layer waterfall, and automatic Docker retry when a Podman run hits an architecture mismatch.",
    "tech": [
      "Rust",
      "Tauri",
      "React",
      "TypeScript",
      "Docker",
      "Podman"
    ],
    "shots": [
      "assets/dockman/dashboard.webp",
      "assets/dockman/containers.webp",
      "assets/dockman/images.webp",
      "assets/dockman/volumes.webp",
      "assets/dockman/networks.webp",
      "assets/dockman/builds.webp",
      "assets/dockman/run-container.webp",
      "assets/dockman/settings.webp"
    ]
  },
  {
    "name": "sandkit",
    "meta": "Code Playground SDK · TypeScript",
    "repo": "https://github.com/AbyAbyss/sandkit",
    "site": {
      "href": "sandkit/",
      "label": "Try it live"
    },
    "desc": "Embed a multi-language code playground in any React app with a single component. JavaScript and Python run entirely in the browser on QuickJS and Pyodide (~50ms, no API key, code never leaves the machine), while Go, Rust and Bash execute on a self-hosted Piston engine behind a Hono API and a BullMQ queue. Ships with key management, usage metering and Stripe billing.",
    "tech": [
      "TypeScript",
      "Hono",
      "WebAssembly",
      "Turborepo",
      "Pyodide",
      "QuickJS"
    ],
    "fit": true,
    "shots": [
      "sandkit.svg"
    ]
  },
  {
    "name": "DevConnect",
    "meta": "All-in-one Dev Tool · Tauri",
    "priv": true,
    "desc": "A developer desktop app combining a multi-database client, a REST client, a rich document editor and a VSCode-style plugin system. MySQL, PostgreSQL, SQLite, MongoDB and Redis behind one UI with IntelliSense and a schema explorer, plus docs where live database queries and REST requests embed as blocks. Shipped through CI with parallel stable and alpha channels.",
    "tech": [
      "Rust",
      "Tauri",
      "React",
      "TypeScript",
      "PostgreSQL",
      "MongoDB"
    ],
    "shots": [
      "shots/devconnect.svg"
    ]
  },
  {
    "name": "GraceTrack",
    "meta": "Offline-first Mobile App · Flutter",
    "priv": true,
    "desc": "An offline-first giving tracker with no backend, no accounts and no analytics. Data lives on the device and, optionally, in the user's own Google Sheet through a drive.file scope that can only see the one file it created. Rule-based income splits stored as immutable snapshots, recurrence detection, timezone- and OEM-aware notifications, and honest multi-currency handling.",
    "tech": [
      "Flutter",
      "Dart",
      "Riverpod",
      "Drift/SQLite",
      "OAuth"
    ],
    "fit": true,
    "shots": [
      "shots/gracetrack/screen-home.svg",
      "shots/gracetrack/screen-entry.svg",
      "shots/gracetrack/screen-reports.svg",
      "shots/gracetrack/screen-history.svg",
      "shots/gracetrack/privacy.svg"
    ]
  },
  {
    "name": "Yankit",
    "meta": "macOS Utility · Swift",
    "repo": "https://github.com/AbyAbyss/Yankit",
    "site": {
      "href": "Yankit",
      "label": "Visit the site"
    },
    "desc": "A fast, free, open-source macOS clipboard manager. It remembers the text, images and files you copy and pastes any of them back with ⌘⇧V. History lives in SQLite with payloads on disk rather than in RAM, so it idles around 40 MB, and it deliberately skips password-manager content and stays out of Spotlight and Time Machine.",
    "tech": [
      "Swift",
      "SwiftUI",
      "AppKit",
      "macOS",
      "SQLite"
    ],
    "fit": true,
    "shots": [
      "shots/yankit/hero.jpg",
      "shots/yankit/panel.png",
      "shots/yankit/preview.gif",
      "shots/yankit/peek.png",
      "shots/yankit/settings.png",
      "shots/yankit/architecture.svg"
    ]
  },
  {
    "name": "wimys_crumb",
    "meta": "Disk Scanner · Swift",
    "repo": "https://github.com/AbyAbyss/wimys_crumb",
    "site": {
      "href": "wimys_crumb",
      "label": "Visit the site"
    },
    "desc": "A macOS disk-space scanner that walks ~5M files in a few minutes and shows exactly where the space went. The scan tree streams into SQLite on disk rather than memory, so browsing a 5M-file scan stays under 200 MB resident. Groups every node_modules, DerivedData and Caches across the whole drive, and funnels all deletes through one protected-path-aware service with Undo.",
    "tech": [
      "Swift",
      "SwiftUI",
      "GRDB",
      "SQLite",
      "macOS"
    ],
    "fit": true,
    "shots": [
      "https://raw.githubusercontent.com/AbyAbyss/wimys_crumb/main/docs/overview.svg",
      "https://raw.githubusercontent.com/AbyAbyss/wimys_crumb/main/docs/architecture.svg"
    ]
  },
  {
    "name": "InkTerm",
    "meta": "AI Terminal · Tauri",
    "repo": "https://github.com/AbyAbyss/InkTerm",
    "site": {
      "href": "inkterm",
      "label": "Visit the site"
    },
    "desc": "A cross-platform desktop terminal with a stylized UI: multi-tab sessions, a file-browser overlay, live CPU/memory/network stats, an AI agent panel and MCP server management with per-server tool toggles. Five themes in a frameless transparent window. Still in active development.",
    "tech": [
      "Rust",
      "Tauri",
      "React",
      "TypeScript",
      "MCP"
    ],
    "shots": [
      "assets/inkterm/terminal.webp",
      "assets/inkterm/ai-agent.webp",
      "assets/inkterm/mcp.webp",
      "assets/inkterm/retro-mcp.webp",
      "assets/inkterm/dark-pro.webp",
      "assets/inkterm/settings.webp"
    ]
  },
  {
    "name": "WALLE",
    "meta": "AI Desktop Companion · Tauri + Rust",
    "repo": "https://github.com/AbyAbyss/my_walle",
    "site": {
      "href": "walle",
      "label": "Visit the site"
    },
    "desc": "A desktop AI companion that lives in the corner of your screen. Press Ctrl+Shift+Space, ask it to open an app or check git status, and it answers in a speech bubble with a face to match. Two mascots, a robot and a parrot, with seven emotions each. An early experiment from March 2026, no longer in active development.",
    "tech": [
      "Rust",
      "Tauri",
      "React",
      "TypeScript"
    ],
    "shots": [
      "assets/walle/mascots.webp",
      "assets/walle/desktop.webp"
    ]
  },
  {
    "name": "PrivateVault",
    "meta": "Encrypted Vault · Flutter",
    "priv": true,
    "desc": "A cross-platform privacy vault that encrypts media on the device and stores it in the user's own Google Drive appdata folder, hidden from the normal Drive UI. Vault encryption is independent of the device lock screen, so the blobs are useless without the passphrase, and decrypted data is never written to disk. Ships a documented container format and a standalone CLI decryptor.",
    "tech": [
      "Flutter",
      "Dart",
      "AES",
      "Argon2",
      "OAuth",
      "Google Drive API"
    ],
    "fit": true,
    "shots": [
      "shots/privatevault.svg"
    ]
  }
];

export const WORK = [
  {
    "name": "LLM & MCP Platform",
    "org": "Josys",
    "meta": "AI / LLM Systems",
    "desc": "An internal LLM platform for context-aware retrieval across production data, with a graph database for semantic querying. Saved the team 8 hours a week with 60% less manual querying. MCP clients and servers cut integration time for new services from 2 weeks to 2 days.",
    "tech": [
      "LLMs",
      "RAG",
      "LangChain",
      "MCP",
      "Graph DB",
      "Node.js"
    ]
  },
  {
    "name": "Analytics Platform",
    "org": "Josys",
    "meta": "Data & Analytics",
    "desc": "A reporting and analytics stack: Airbyte ingestion, DuckDB for columnar analytics and Apache Airflow for orchestration. About 70% faster queries above 50M rows, 45% lower infrastructure cost, and reports down from 25 minutes to under 2.",
    "tech": [
      "Airbyte",
      "DuckDB",
      "Apache Airflow",
      "Python",
      "ETL"
    ]
  },
  {
    "name": "Notification Platform",
    "org": "Josys",
    "meta": "Platform Engineering",
    "desc": "One notification service handling 50,000 messages a day, consolidating 8 separate flows across email, Slack and Teams, on REST and AWS SQS. Built as part of rolling out NestJS as the standard across 12+ microservices, which cut onboarding from 6 weeks to 3.",
    "tech": [
      "NestJS",
      "TypeScript",
      "AWS SQS",
      "Slack",
      "Microsoft Teams"
    ]
  },
  {
    "name": "Enterprise Browser Extension",
    "org": "Josys",
    "meta": "Web Extensions",
    "desc": "A browser extension serving over 2 million users from one codebase across Chromium and Firefox, supporting Manifest V2 and V3, with silent activation for enterprise deployment.",
    "tech": [
      "TypeScript",
      "WebExtensions",
      "Chromium",
      "Firefox"
    ]
  },
  {
    "name": "SaaS Simulation Framework",
    "org": "Josys",
    "meta": "Testing Infrastructure",
    "desc": "Simulates 300+ integrated SaaS providers for testing at scale. Cut testing infrastructure cost 35%, never needed a bug fix, and became the customer-facing production sandbox.",
    "tech": [
      "Node.js",
      "Golang",
      "AWS ECS",
      "Docker"
    ]
  },
  {
    "name": "Security Scanning Service",
    "org": "Josys",
    "meta": "Security · Team lead",
    "desc": "Led the security project and team: a Go service that orchestrates Semgrep, Gitleaks and Trivy across the company's GitHub repository estate.",
    "tech": [
      "Go",
      "Semgrep",
      "Gitleaks",
      "Trivy",
      "GitHub"
    ]
  },
  {
    "name": "GraphQL Multi-DB Platform",
    "org": "Josys",
    "meta": "GraphQL · Multi-DB",
    "desc": "A multi-database GraphQL platform with automatic schema generation, unifying MySQL, MongoDB and PostgreSQL behind one API with dynamic filter conversion.",
    "tech": [
      "GraphQL",
      "NestJS",
      "MySQL",
      "MongoDB",
      "PostgreSQL"
    ]
  },
  {
    "name": "ZTNA Solution",
    "org": "InstaSafe",
    "meta": "Security · R&D",
    "desc": "A Zero Trust Network Access product built from scratch: a cross-platform desktop client plus a gateway server for agentless access to private web apps. Helped bring in 10+ enterprise customers and cut customer onboarding time 40%.",
    "tech": [
      "Node.js",
      "Spring Boot",
      "ZTNA",
      "Secure Gateway"
    ]
  },
  {
    "name": "Dev-Connector",
    "org": "Side project",
    "meta": "Desktop · P2P",
    "desc": "A decentralised, privacy-first API client that needs no server: a Tauri (Rust) desktop shell with GunDB peer-to-peer sync. REST and GraphQL today, gRPC planned.",
    "tech": [
      "React",
      "Tauri",
      "Rust",
      "GunDB"
    ]
  }
];

export const SKILLS = [
  [
    "Languages",
    [
      "TypeScript",
      "JavaScript",
      "Node.js",
      "Go",
      "Python",
      "Java",
      "SQL",
      "Lua"
    ]
  ],
  [
    "Backend",
    [
      "NestJS",
      "Spring Boot",
      "FastAPI",
      "REST",
      "GraphQL",
      "Microservices",
      "Event-driven architecture"
    ]
  ],
  [
    "Web & Client",
    [
      "React",
      "Next.js",
      "Angular",
      "Electron",
      "Tauri",
      "Cross-browser extensions"
    ]
  ],
  [
    "Cloud & Infra",
    [
      "AWS (ECS, SQS, SNS, S3)",
      "Docker",
      "Kubernetes",
      "CI/CD"
    ]
  ],
  [
    "Data & Search",
    [
      "PostgreSQL",
      "MySQL",
      "MongoDB",
      "OpenSearch",
      "Redis",
      "Airflow",
      "Airbyte",
      "DuckDB"
    ]
  ],
  [
    "AI & LLM",
    [
      "MCP",
      "LLMs",
      "RAG",
      "LangChain",
      "AI agents"
    ]
  ],
  [
    "Security",
    [
      "Zero Trust Network Access",
      "WireGuard",
      "Semgrep",
      "Gitleaks",
      "Trivy"
    ]
  ]
];
