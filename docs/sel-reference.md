# SEL Reference — Signal Expression Language

SEL (Signal Expression Language) is the declarative workflow language used by SigOps to describe automation pipelines. A `.sel` file defines what signals to watch, what steps to execute, and how to handle errors, retries, and rollbacks.

## Overview

```sel
# Watch for a signal condition
signal cpu.usage > 90 on "prod-01"

# Execute steps in sequence
step kill_process {
  tool: "sys.kill-top-cpu"
  params: { host: "prod-01", dry_run: false }
  retry: { max: 3, backoff: 2000 }
}

step notify {
  tool: "slack.send-message"
  params: { channel: "#ops-alerts", text: "CPU reduced on prod-01" }
  when: "$kill_process.success == true"
}
```

---

## Signal Matching

A `signal` declaration watches a metric or event stream and triggers the workflow when the condition is met.

```sel
# Numeric comparison
signal cpu.usage > 90 on "prod-01"
signal disk.free_gb < 10 on "db-server"
signal response_time_ms >= 5000

# Event matching
signal deploy.completed for "payment-service"
signal alert.fired where severity == "critical"

# With duration qualifier (sustained for N seconds)
signal cpu.usage > 85 on "web-01" for 300s
```

### Signal syntax

```
signal <metric> <operator> <value> [on "<target>"] [for <duration>]
signal <event> [for "<source>"] [where <condition>]
```

Supported operators: `>`, `>=`, `<`, `<=`, `==`, `!=`

---

## Step Definitions

A `step` block defines a unit of work executed by a SigOps tool.

```sel
step <step_name> {
  tool: "<tool-name>"
  params: { <key>: <value>, ... }
  [when: "<condition>"]
  [retry: { max: <n>, backoff: <ms> }]
  [rollback: { tool: "<tool>", params: { ... } }]
  [timeout: <ms>]
}
```

### Basic step

```sel
step backup {
  tool: "pg.backup"
  params: {
    host: "db-01",
    database: "production",
    destination: "s3://backups/pg/"
  }
}
```

### Referencing step output

Access previous step output with `$step_name.output.<field>`:

```sel
step get_pid {
  tool: "sys.find-process"
  params: { name: "postgres" }
}

step kill_it {
  tool: "sys.kill"
  params: { pid: "$get_pid.output.pid" }
}
```

Available step result fields:
- `$step.success` — boolean, whether the step succeeded
- `$step.output.<field>` — any field from the tool's outputSchema
- `$step.error` — error message string (when `$step.success == false`)
- `$step.duration_ms` — execution time

---

## Conditions (`when` / `otherwise`)

The `when` clause makes a step conditional on a boolean expression:

```sel
step send_alert {
  tool: "slack.send-message"
  params: { channel: "#alerts", text: "Disk low on $backup.output.host" }
  when: "$backup.success == false"
}
```

Use `otherwise` at the workflow level to define a fallback step:

```sel
step deploy {
  tool: "k8s.deploy"
  params: { service: "api", image: "v2.0.1" }
}

otherwise {
  tool: "k8s.rollback"
  params: { service: "api" }
}
```

### Expression syntax

Conditions use a simple expression language:

```
<expr> ::= <value> <op> <value>
         | <expr> && <expr>
         | <expr> || <expr>
         | !<expr>

<value> ::= "$step.field"
           | "string literal"
           | number
           | true | false

<op> ::= == | != | > | >= | < | <=
```

---

## Retry

```sel
step flaky_api_call {
  tool: "http.post"
  params: { url: "https://api.example.com/action" }
  retry: {
    max: 5,
    backoff: 1000      # ms between retries (exponential by default)
  }
}
```

Retry fields:
- `max` — maximum number of retry attempts (not counting the initial try)
- `backoff` — initial delay in milliseconds (doubles on each retry)

---

## Rollback

Define a rollback action to automatically undo side effects if a step fails:

```sel
step deploy {
  tool: "k8s.deploy"
  params: { service: "payments", image: "v3.0.0" }
  rollback: {
    tool: "k8s.rollback"
    params: { service: "payments" }
  }
}
```

Rollback runs only when the step itself fails (after all retries are exhausted).

---

## Variables

Declare named variables for reuse across steps:

```sel
var host = "prod-db-01"
var backup_path = "s3://backups/prod/"

step backup {
  tool: "pg.backup"
  params: { host: $host, destination: $backup_path }
}

step verify {
  tool: "pg.verify-backup"
  params: { path: $backup_path }
}
```

---

## Parallel Execution

Use `parallel` to run multiple steps concurrently:

```sel
parallel {
  step check_cpu { tool: "sys.check-cpu" params: { host: "web-01" } }
  step check_mem { tool: "sys.check-mem" params: { host: "web-01" } }
  step check_disk { tool: "sys.check-disk" params: { host: "web-01" } }
}

# Steps after the parallel block wait for all branches to complete
step report {
  tool: "slack.send-report"
  params: {
    cpu_ok: "$check_cpu.output.ok",
    mem_ok: "$check_mem.output.ok",
    disk_ok: "$check_disk.output.ok"
  }
}
```

---

## Comments

```sel
# Single-line comment

# Multi-line comments also use #
# Each line must start with #
```

---

## Complete Grammar (EBNF)

```ebnf
program        = (comment | var_decl | signal_decl | step_decl | parallel_block | otherwise_block)*

comment        = "#" TEXT NEWLINE

var_decl       = "var" IDENT "=" literal

signal_decl    = "signal" metric_expr ["on" STRING] ["for" DURATION]
               | "signal" event_name ["for" STRING] ["where" condition]

metric_expr    = IDENT "." IDENT operator number

step_decl      = "step" IDENT "{" step_body "}"

step_body      = "tool" ":" STRING
                 ["params" ":" "{" param_list "}"]
                 ["when" ":" condition]
                 ["retry" ":" "{" retry_opts "}"]
                 ["rollback" ":" "{" rollback_opts "}"]
                 ["timeout" ":" number]

parallel_block = "parallel" "{" step_decl+ "}"

otherwise_block= "otherwise" "{" "tool" ":" STRING ["params" ":" "{" param_list "}"] "}"

param_list     = (IDENT ":" value ("," IDENT ":" value)*)?

retry_opts     = "max" ":" number ["," "backoff" ":" number]

rollback_opts  = "tool" ":" STRING ["," "params" ":" "{" param_list "}"]

condition      = expr (("&&" | "||") expr)*
               | "!" condition

expr           = value operator value

value          = step_ref | STRING | number | bool | VAR_REF

step_ref       = "$" IDENT "." ("success" | "error" | "duration_ms" | "output" "." IDENT)

operator       = "==" | "!=" | ">" | ">=" | "<" | "<="

literal        = STRING | number | bool
bool           = "true" | "false"
DURATION       = number ("s" | "m" | "h")
```

---

## Common Patterns

### Health check and alert

```sel
signal http.status != 200 on "api.example.com" for 60s

step page_oncall {
  tool: "pagerduty.trigger"
  params: { service: "api", severity: "critical", message: "API returning non-200" }
}
```

### Database backup with verification

```sel
var db_host = "db-primary"
var s3_path = "s3://my-backups/daily/"

step backup {
  tool: "pg.backup"
  params: { host: $db_host, destination: $s3_path }
  retry: { max: 2, backoff: 30000 }
}

step verify {
  tool: "pg.verify-backup"
  params: { path: "$backup.output.backup_file" }
  when: "$backup.success == true"
}

step notify_slack {
  tool: "slack.send-message"
  params: {
    channel: "#ops",
    text: "Backup complete: $backup.output.backup_file"
  }
  when: "$verify.output.valid == true"
}
```

### Disk cleanup with threshold check

```sel
signal disk.usage_pct > 85 on "file-server-01"

step cleanup {
  tool: "sys.cleanup-old-files"
  params: { host: "file-server-01", older_than_days: 30, path: "/var/log" }
}

step recheck {
  tool: "sys.check-disk"
  params: { host: "file-server-01" }
}

step escalate {
  tool: "pagerduty.trigger"
  params: { message: "Disk still >85% after cleanup" }
  when: "$recheck.output.usage_pct > 85"
}
```

---

## Working with SEL Programmatically

Use `@sigops/sel-tools` to parse, lint, and format `.sel` files:

```ts
import { parse, LintEngine, defaultRules, format } from '@sigops/sel-tools';

const source = `
signal cpu.usage > 90 on "host-01"
step fix { tool: "sys.kill-top-cpu" params: { host: "host-01" } }
`;

// Parse
const ast = parse(source);

// Lint
const engine = new LintEngine(defaultRules);
const diagnostics = engine.lint(ast);
for (const d of diagnostics) {
  console.log(`${d.severity} at line ${d.line}: ${d.message}`);
}

// Format
const formatted = format(source, { indent: 2 });
```
