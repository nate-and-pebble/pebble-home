#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");

// --- Config ---

function loadConfig() {
  const configPath = path.join(os.homedir(), ".pebble.json");
  const defaults = {
    apiUrl: "http://localhost:3000",
    apiKey: "",
  };

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

const config = loadConfig();

// --- HTTP helpers ---

async function api(method, endpoint, body) {
  const url = `${config.apiUrl.replace(/\/$/, "")}${endpoint}`;
  const headers = { "Content-Type": "application/json" };
  if (config.apiKey) headers["X-API-Key"] = config.apiKey;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const json = await res.json();

  if (!res.ok) {
    console.error(`Error ${res.status}: ${json.error || "Unknown error"}`);
    process.exit(1);
  }

  return json;
}

// --- Formatting ---

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const CYAN = "\x1b[36m";

function priorityColor(p) {
  switch (p) {
    case "urgent":
      return RED;
    case "high":
      return RED;
    case "medium":
      return YELLOW;
    case "low":
      return DIM;
    default:
      return RESET;
  }
}

function statusLabel(s) {
  switch (s) {
    case "done":
      return `${GREEN}done${RESET}`;
    case "in_progress":
      return `${BLUE}in progress${RESET}`;
    case "todo":
      return `${DIM}todo${RESET}`;
    default:
      return s;
  }
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// --- Commands ---

async function cmdBrain(args) {
  if (args.length === 0 || args[0] === "list") {
    // List brain dumps
    const statusFilter = args.includes("--status")
      ? args[args.indexOf("--status") + 1]
      : null;
    const endpoint = statusFilter
      ? `/api/brain-dumps?status=${statusFilter}`
      : "/api/brain-dumps";
    const json = await api("GET", endpoint);

    if (!json.data || json.data.length === 0) {
      console.log(`${DIM}No brain dumps yet.${RESET}`);
      return;
    }

    console.log(`${BOLD}Brain Dumps${RESET} (${json.pagination.total} total)\n`);
    for (const bd of json.data) {
      const preview =
        bd.content.length > 70 ? bd.content.slice(0, 70) + "..." : bd.content;
      console.log(
        `  ${CYAN}${bd.id.slice(0, 8)}${RESET}  ${preview}  ${DIM}${timeAgo(bd.created_at)}${RESET}  [${bd.status}]`
      );
    }
    return;
  }

  if (args[0] === "add") {
    const content = args.slice(1).join(" ");
    if (!content) {
      console.error("Usage: pebble brain add <content>");
      process.exit(1);
    }
    const result = await api("POST", "/api/brain-dumps", { content });
    console.log(`${GREEN}Saved!${RESET} ID: ${CYAN}${result.id.slice(0, 8)}${RESET}`);
    return;
  }

  if (args[0] === "status") {
    const id = args[1];
    const newStatus = args[2];
    if (!id || !newStatus) {
      console.error("Usage: pebble brain status <id> <new-status>");
      process.exit(1);
    }
    const result = await api("PATCH", `/api/brain-dumps/${id}`, {
      status: newStatus,
    });
    console.log(
      `${GREEN}Updated!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET} → ${newStatus}`
    );
    return;
  }

  console.error(
    `Unknown brain command: ${args[0]}\nUsage: pebble brain [list|add|status]`
  );
  process.exit(1);
}

async function cmdTasks(args) {
  const statusFilter = args.includes("--status")
    ? args[args.indexOf("--status") + 1]
    : null;
  const priorityFilter = args.includes("--priority")
    ? args[args.indexOf("--priority") + 1]
    : null;

  let endpoint = "/api/tasks?";
  if (statusFilter) endpoint += `status=${statusFilter}&`;
  if (priorityFilter) endpoint += `priority=${priorityFilter}&`;

  const json = await api("GET", endpoint);

  if (!json.data || json.data.length === 0) {
    console.log(`${DIM}No tasks found.${RESET}`);
    return;
  }

  console.log(`${BOLD}Tasks${RESET} (${json.pagination.total} total)\n`);
  for (const t of json.data) {
    const pc = priorityColor(t.priority);
    console.log(
      `  ${CYAN}${t.id.slice(0, 8)}${RESET}  ${pc}[${t.priority}]${RESET}  ${t.title}  ${statusLabel(t.status)}  ${DIM}${timeAgo(t.created_at)}${RESET}`
    );
  }
}

async function cmdTask(args) {
  if (args.length === 0) {
    console.error(
      "Usage:\n  pebble task add <title> [--priority high|medium|low]\n  pebble task update <id> [--status todo|in_progress|done] [--priority ...]"
    );
    process.exit(1);
  }

  if (args[0] === "add") {
    // Parse title and flags
    const flagIdx = args.findIndex(
      (a, i) => i > 0 && a.startsWith("--")
    );
    const titleParts =
      flagIdx > 0 ? args.slice(1, flagIdx) : args.slice(1);
    const title = titleParts.join(" ");

    if (!title) {
      console.error("Usage: pebble task add <title> [--priority high]");
      process.exit(1);
    }

    const body = { title };
    if (args.includes("--priority")) {
      body.priority = args[args.indexOf("--priority") + 1];
    }
    if (args.includes("--description")) {
      body.description = args[args.indexOf("--description") + 1];
    }

    const result = await api("POST", "/api/tasks", body);
    console.log(
      `${GREEN}Created!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  ${result.title}`
    );
    return;
  }

  if (args[0] === "update") {
    const id = args[1];
    if (!id) {
      console.error("Usage: pebble task update <id> --status done");
      process.exit(1);
    }

    const body = {};
    if (args.includes("--status")) {
      body.status = args[args.indexOf("--status") + 1];
    }
    if (args.includes("--priority")) {
      body.priority = args[args.indexOf("--priority") + 1];
    }
    if (args.includes("--title")) {
      body.title = args[args.indexOf("--title") + 1];
    }

    if (Object.keys(body).length === 0) {
      console.error("Provide at least one field to update (--status, --priority, --title)");
      process.exit(1);
    }

    const result = await api("PATCH", `/api/tasks/${id}`, body);
    console.log(
      `${GREEN}Updated!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  ${result.title}  ${statusLabel(result.status)}`
    );
    return;
  }

  if (args[0] === "done") {
    const id = args[1];
    if (!id) {
      console.error("Usage: pebble task done <id>");
      process.exit(1);
    }
    const result = await api("PATCH", `/api/tasks/${id}`, { status: "done" });
    console.log(
      `${GREEN}Done!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  ${result.title}`
    );
    return;
  }

  console.error(`Unknown task command: ${args[0]}\nUsage: pebble task [add|update|done]`);
  process.exit(1);
}

async function cmdBulletins(args) {
  const statusFilter = args.includes("--status")
    ? args[args.indexOf("--status") + 1]
    : null;

  let endpoint = "/api/bulletins?";
  if (statusFilter) endpoint += `status=${statusFilter}&`;

  const json = await api("GET", endpoint);

  if (!json.data || json.data.length === 0) {
    console.log(`${DIM}No bulletins yet.${RESET}`);
    return;
  }

  console.log(`${BOLD}Bulletins${RESET} (${json.pagination.total} total)\n`);
  for (const b of json.data) {
    const icon = b.status === "new" ? `${YELLOW}📢 NEW${RESET}` : `${DIM}📋${RESET}`;
    const preview = b.content
      ? b.content.length > 50
        ? b.content.slice(0, 50) + "..."
        : b.content
      : "";
    console.log(
      `  ${CYAN}${b.id.slice(0, 8)}${RESET}  ${icon}  ${BOLD}${b.title}${RESET}  ${DIM}${timeAgo(b.created_at)}${RESET}`
    );
    if (preview) {
      console.log(`           ${DIM}${preview}${RESET}`);
    }
  }
}

async function cmdBulletin(args) {
  if (args.length === 0) {
    console.error(
      "Usage:\n  pebble bulletin add <title> [--content <content>]\n  pebble bulletin read <id>\n  pebble bulletin list"
    );
    process.exit(1);
  }

  if (args[0] === "add") {
    const flagIdx = args.findIndex(
      (a, i) => i > 0 && a.startsWith("--")
    );
    const titleParts =
      flagIdx > 0 ? args.slice(1, flagIdx) : args.slice(1);
    const title = titleParts.join(" ");

    if (!title) {
      console.error("Usage: pebble bulletin add <title> [--content <content>]");
      process.exit(1);
    }

    const body = { title };
    if (args.includes("--content")) {
      body.content = args[args.indexOf("--content") + 1];
    }

    const result = await api("POST", "/api/bulletins", body);
    console.log(
      `${GREEN}Posted!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  ${result.title}`
    );
    return;
  }

  if (args[0] === "read") {
    const id = args[1];
    if (!id) {
      console.error("Usage: pebble bulletin read <id>");
      process.exit(1);
    }
    const result = await api("PATCH", `/api/bulletins/${id}`, { status: "read" });
    console.log(
      `${GREEN}Marked read!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  ${result.title}`
    );
    return;
  }

  if (args[0] === "list") {
    await cmdBulletins(args.slice(1));
    return;
  }

  console.error(`Unknown bulletin command: ${args[0]}\nUsage: pebble bulletin [add|read|list]`);
  process.exit(1);
}

// --- Agent Commands ---

async function cmdRun(args) {
  if (args.length === 0 || args[0] === "list") {
    const statusFilter = args.includes("--status")
      ? args[args.indexOf("--status") + 1]
      : null;
    let endpoint = "/api/agent/runs?limit=10";
    if (statusFilter) endpoint += `&status=${statusFilter}`;

    const json = await api("GET", endpoint);
    if (!json.data || json.data.length === 0) {
      console.log(`${DIM}No agent runs yet.${RESET}`);
      return;
    }

    console.log(`${BOLD}Agent Runs${RESET}\n`);
    for (const r of json.data) {
      const st =
        r.status === "running"
          ? `${GREEN}running${RESET}`
          : r.status === "completed"
            ? `${DIM}completed${RESET}`
            : r.status === "failed"
              ? `${RED}failed${RESET}`
              : `${YELLOW}expired${RESET}`;
      console.log(
        `  ${CYAN}${r.id.slice(0, 8)}${RESET}  ${BOLD}${r.agent_id}${RESET}  ${st}  ${DIM}${timeAgo(r.started_at)}${RESET}`
      );
      if (r.summary) {
        console.log(`           ${DIM}${r.summary}${RESET}`);
      }
    }
    return;
  }

  if (args[0] === "start") {
    const agentId = args[1];
    if (!agentId) {
      console.error("Usage: pebble run start <agent-id> [--lease <minutes>]");
      process.exit(1);
    }
    const body = { agent_id: agentId };
    if (args.includes("--lease")) {
      body.lease_duration_minutes = parseInt(args[args.indexOf("--lease") + 1]);
    }
    const result = await api("POST", "/api/agent/runs", body);
    console.log(
      `${GREEN}Run started!${RESET} ${CYAN}${result.run.id.slice(0, 8)}${RESET}  agent=${result.run.agent_id}`
    );
    if (result.recent_journal.length > 0) {
      console.log(`\n${BOLD}Recent context:${RESET}`);
      for (const entry of result.recent_journal.slice(0, 5)) {
        console.log(`  ${DIM}[${entry.entry_type}]${RESET} ${entry.content}`);
      }
    }
    return;
  }

  if (args[0] === "complete" || args[0] === "fail") {
    const id = args[1];
    if (!id) {
      console.error(`Usage: pebble run ${args[0]} <run-id> [--summary "..."]`);
      process.exit(1);
    }
    const body = { status: args[0] === "complete" ? "completed" : "failed" };
    if (args.includes("--summary")) {
      body.summary = args[args.indexOf("--summary") + 1];
    }
    const result = await api("PATCH", `/api/agent/runs/${id}`, body);
    console.log(
      `${GREEN}Run ${args[0]}d!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}`
    );
    return;
  }

  if (args[0] === "heartbeat") {
    const id = args[1];
    if (!id) {
      console.error("Usage: pebble run heartbeat <run-id>");
      process.exit(1);
    }
    const result = await api("PATCH", `/api/agent/runs/${id}`, {
      heartbeat: true,
    });
    console.log(
      `${GREEN}Heartbeat!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  lease until ${result.lease_expires_at}`
    );
    return;
  }

  if (args[0] === "log") {
    const id = args[1];
    if (!id) {
      console.error("Usage: pebble run log <run-id>");
      process.exit(1);
    }
    const json = await api("GET", `/api/agent/runs/${id}/log`);
    if (!json.data || json.data.length === 0) {
      console.log(`${DIM}No log entries.${RESET}`);
      return;
    }
    console.log(`${BOLD}Run Log${RESET}\n`);
    for (const entry of json.data) {
      console.log(
        `  ${DIM}${timeAgo(entry.created_at)}${RESET}  [${entry.entry_type}]  ${entry.content}`
      );
    }
    return;
  }

  console.error(
    `Unknown run command: ${args[0]}\nUsage: pebble run [list|start|complete|fail|heartbeat|log]`
  );
  process.exit(1);
}

async function cmdJournal(args) {
  const limit = args.includes("--limit")
    ? args[args.indexOf("--limit") + 1]
    : "20";
  const agentFilter = args.includes("--agent")
    ? args[args.indexOf("--agent") + 1]
    : null;

  let endpoint = `/api/agent/journal?limit=${limit}`;
  if (agentFilter) endpoint += `&agent_id=${agentFilter}`;

  const json = await api("GET", endpoint);
  if (!json.data || json.data.length === 0) {
    console.log(`${DIM}No journal entries yet.${RESET}`);
    return;
  }

  console.log(`${BOLD}Agent Journal${RESET}\n`);
  for (const entry of json.data) {
    const typeColor =
      entry.entry_type === "error"
        ? RED
        : entry.entry_type === "handoff"
          ? YELLOW
          : DIM;
    console.log(
      `  ${DIM}${timeAgo(entry.created_at)}${RESET}  ${CYAN}${entry.agent_id}${RESET}  ${typeColor}[${entry.entry_type}]${RESET}  ${entry.content}`
    );
  }
}

async function cmdClaim(args) {
  if (args.length === 0) {
    console.error(
      "Usage:\n  pebble claim <task-id> --run <run-id> --agent <agent-id>\n  pebble release <task-id> --run <run-id> [--reason completed|abandoned|handoff]"
    );
    process.exit(1);
  }

  const taskId = args[0];
  const runId = args.includes("--run")
    ? args[args.indexOf("--run") + 1]
    : null;
  const agentId = args.includes("--agent")
    ? args[args.indexOf("--agent") + 1]
    : null;

  if (!runId || !agentId) {
    console.error("--run and --agent are required");
    process.exit(1);
  }

  const result = await api("POST", `/api/tasks/${taskId}/claim`, {
    run_id: runId,
    agent_id: agentId,
  });
  console.log(
    `${GREEN}Claimed!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  ${result.title}  agent=${agentId}`
  );
}

async function cmdRelease(args) {
  if (args.length === 0) {
    console.error(
      "Usage: pebble release <task-id> --run <run-id> [--reason completed|abandoned|handoff]"
    );
    process.exit(1);
  }

  const taskId = args[0];
  const runId = args.includes("--run")
    ? args[args.indexOf("--run") + 1]
    : null;
  const reason = args.includes("--reason")
    ? args[args.indexOf("--reason") + 1]
    : "manual";

  const result = await api("DELETE", `/api/tasks/${taskId}/claim`, {
    run_id: runId,
    reason,
  });
  console.log(
    `${GREEN}Released!${RESET} ${CYAN}${result.id.slice(0, 8)}${RESET}  ${result.title}  reason=${reason}`
  );
}

async function cmdContext() {
  const json = await api("GET", "/api/agent/context");

  console.log(`\n  ${BOLD}Agent Coordination Context${RESET}\n`);

  if (json.active_runs.length > 0) {
    console.log(`  ${BOLD}Active Runs:${RESET}`);
    for (const r of json.active_runs) {
      console.log(
        `    ${CYAN}${r.id.slice(0, 8)}${RESET}  ${r.agent_id}  ${DIM}started ${timeAgo(r.started_at)}${RESET}`
      );
    }
  } else {
    console.log(`  ${DIM}No active runs.${RESET}`);
  }

  if (json.claimed_tasks.length > 0) {
    console.log(`\n  ${BOLD}Claimed Tasks:${RESET}`);
    for (const t of json.claimed_tasks) {
      console.log(
        `    ${CYAN}${t.id.slice(0, 8)}${RESET}  ${t.title}  ${BLUE}by ${t.assigned_agent}${RESET}`
      );
    }
  }

  if (json.available_tasks.length > 0) {
    console.log(`\n  ${BOLD}Available Tasks:${RESET}`);
    for (const t of json.available_tasks) {
      const pc = priorityColor(t.priority);
      console.log(
        `    ${CYAN}${t.id.slice(0, 8)}${RESET}  ${pc}[${t.priority}]${RESET}  ${t.title}  ${statusLabel(t.status)}`
      );
    }
  } else {
    console.log(`\n  ${DIM}No available tasks.${RESET}`);
  }

  if (json.recent_journal.length > 0) {
    console.log(`\n  ${BOLD}Recent Journal:${RESET}`);
    for (const e of json.recent_journal.slice(0, 10)) {
      console.log(
        `    ${DIM}${timeAgo(e.created_at)}${RESET}  ${CYAN}${e.agent_id}${RESET}  [${e.entry_type}]  ${e.content}`
      );
    }
  }

  console.log();
}

async function cmdLog(args) {
  if (args.length < 2) {
    console.error(
      'Usage: pebble log <run-id> <content> [--type action|decision|handoff|error|note]'
    );
    process.exit(1);
  }

  const runId = args[0];
  const typeIdx = args.indexOf("--type");
  let contentParts;
  let entryType = "action";

  if (typeIdx > 0) {
    contentParts = args.slice(1, typeIdx);
    entryType = args[typeIdx + 1] || "action";
  } else {
    contentParts = args.slice(1);
  }

  const content = contentParts.join(" ");
  const result = await api("POST", `/api/agent/runs/${runId}/log`, {
    entry_type: entryType,
    content,
  });
  console.log(`${GREEN}Logged!${RESET} [${result.entry_type}] ${result.content}`);
}

async function cmdStatus() {
  const json = await api("GET", "/api/status");

  console.log(`\n  ${BOLD}🪨 Pebble Status${RESET}\n`);
  console.log(`  Status:      ${GREEN}${json.status}${RESET}`);
  console.log(`  Uptime:      ${json.uptime}`);
  console.log(`  Brain Dumps: ${BOLD}${json.counts.brainDumps}${RESET}`);
  console.log(`  Tasks:       ${BOLD}${json.counts.totalTasks}${RESET} total, ${GREEN}${json.counts.tasksDone} done${RESET}`);
  console.log(`  Bulletins:   ${BOLD}${json.counts.totalBulletins}${RESET} total, ${YELLOW}${json.counts.unreadBulletins} unread${RESET}`);
  console.log(`  Agent Runs:  ${BOLD}${json.counts.activeAgentRuns || 0}${RESET} active`);
  console.log(`  Timestamp:   ${DIM}${json.timestamp}${RESET}\n`);
}

function showHelp() {
  console.log(`
${BOLD}🪨 Pebble CLI${RESET}

${BOLD}Usage:${RESET}
  pebble <command> [args]

${BOLD}Commands:${RESET}
  brain [list|add|status]   Manage brain dumps
    list                    List brain dumps (--status <status>)
    add <content>           Create a brain dump
    status <id> <status>    Update brain dump status

  tasks                     List tasks (--status, --priority filters)

  task [add|update|done]    Manage individual tasks
    add <title>             Create task (--priority, --description)
    update <id>             Update task (--status, --priority, --title)
    done <id>               Mark task as done

  bulletins                 List bulletins (--status new|read)

  bulletin [add|read|list]  Manage bulletins
    add <title>             Post bulletin (--content <details>)
    read <id>               Mark bulletin as read
    list                    List bulletins

  ${BOLD}Agent Coordination:${RESET}
  run [list|start|complete|fail|heartbeat|log]
    list                    List recent agent runs (--status <status>)
    start <agent-id>        Start a new run (--lease <minutes>)
    complete <run-id>       Mark run completed (--summary "...")
    fail <run-id>           Mark run failed (--summary "...")
    heartbeat <run-id>      Extend run lease
    log <run-id>            Show log entries for a run

  log <run-id> <content>    Add a journal entry (--type action|decision|handoff|error|note)
  journal                   View recent journal entries (--limit N, --agent <id>)
  context                   View full coordination context
  claim <task-id>           Claim a task (--run <run-id> --agent <agent-id>)
  release <task-id>         Release a task claim (--run <run-id> --reason <reason>)

  status                    Show system status

${BOLD}Config:${RESET}
  Create ~/.pebble.json:
  { "apiUrl": "http://localhost:3000", "apiKey": "your-key" }
`);
}

// --- Main ---

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "help" || command === "--help") {
    showHelp();
    return;
  }

  switch (command) {
    case "brain":
      await cmdBrain(args.slice(1));
      break;
    case "tasks":
      await cmdTasks(args.slice(1));
      break;
    case "task":
      await cmdTask(args.slice(1));
      break;
    case "bulletins":
      await cmdBulletins(args.slice(1));
      break;
    case "bulletin":
      await cmdBulletin(args.slice(1));
      break;
    case "run":
      await cmdRun(args.slice(1));
      break;
    case "log":
      await cmdLog(args.slice(1));
      break;
    case "journal":
      await cmdJournal(args.slice(1));
      break;
    case "context":
      await cmdContext();
      break;
    case "claim":
      await cmdClaim(args.slice(1));
      break;
    case "release":
      await cmdRelease(args.slice(1));
      break;
    case "status":
      await cmdStatus();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${RED}Error:${RESET} ${err.message}`);
  process.exit(1);
});
