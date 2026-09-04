/*
 * APCSExamPrep LAB PLAYER
 * =======================
 * An interactive terminal lab, run entirely in the browser over a pretend
 * filesystem described by a lab spec (config/labs/*.json, served by
 * GET /api/labs/:course/:item_id).
 *
 * WHY THE FILESYSTEM IS PRETEND
 * A real shell per student means a container per student. On 1 vCPU and 1 GB of
 * Railway, thirty students in one class period is not a tuning problem, it is a
 * different bill. Everything these labs assess (navigate, list, read, transfer,
 * verify) is assessable over a simulated tree, and a simulation cannot be
 * escaped into. When a lab genuinely needs a real kernel, that is a vendor
 * decision, not a patch to this file.
 *
 * ZERO PII, THE WHOLE REASON THIS GRADES IN THE BROWSER
 * A terminal collects typed strings and a typed string is free text, which this
 * API never stores. So the command line is evaluated here, and what leaves the
 * page is the check index and its boolean:
 *     detail: [{"q":1,"sel":null,"ok":true}, ...]
 * The line the student typed never leaves the browser. Not truncated, not
 * hashed. It is never sent.
 *
 * PREVIEW MODE
 * mount(..., {preview: true}) runs the lab identically and posts nothing, so a
 * teacher can walk a lab without writing an attempt into their own gradebook.
 *
 * Integration (same conventions as heartbeat-reporter.js):
 *   window.APCS_LAB = {
 *     base: 'https://progress.apcsexamprep.com',
 *     getToken: () => localStorage.getItem('apcs_student_token')
 *   };
 * Then either load /lab/:course/:item_id in an iframe, or:
 *   APCSLab.mountById(el, 'ap-networking', '4.3-lab');
 *
 * No em-dashes, per repo convention.
 */
(function (global) {
  "use strict";

  // ── config ─────────────────────────────────────────────────────────────
  function cfg() {
    var c = global.APCS_LAB || {};
    return {
      base: c.base || global.APCS_API_BASE || "",
      getToken: typeof c.getToken === "function" ? c.getToken : function () {
        try {
          // apcse_token is the key apcs-tracker.js and apcs-reporter.js already
          // use on the storefront, so a lab embedded on a lesson page finds the
          // signed-in student with no configuration at all.
          return global.APCS_STUDENT_TOKEN ||
            localStorage.getItem("apcse_token") ||
            localStorage.getItem("apcs_student_token") ||
            localStorage.getItem("student_token") || "";
        } catch (e) { return ""; }
      }
    };
  }

  // ── tiny dom helpers ───────────────────────────────────────────────────
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // The brief is authored markdown-lite: **bold**, `code`, and 1. list lines.
  // Deliberately not a markdown library and deliberately escaped first, so an
  // author typo can never become markup.
  function briefHtml(lines) {
    var out = [], list = [];
    function flush() {
      if (list.length) { out.push("<ol>" + list.join("") + "</ol>"); list = []; }
    }
    lines.forEach(function (raw) {
      var line = inline(esc(raw));
      var m = /^(\d+)\.\s+(.*)$/.exec(raw);
      if (m) { list.push("<li>" + inline(esc(m[2])) + "</li>"); return; }
      flush();
      if (!raw.trim()) return;
      out.push("<p>" + line + "</p>");
    });
    flush();
    return out.join("");
  }
  function inline(s) {
    return s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  // ── pretend filesystem ─────────────────────────────────────────────────
  // A directory is a plain object, a file is a string. Paths are normalised
  // against the host root, so ".." can never walk out of the tree: there is
  // nothing above the root to walk into.
  function Host(name, spec) {
    this.name = name;
    this.label = spec.label || name;
    this.promptText = spec.prompt || "$";
    this.root = Object.keys(spec.fs)[0];
    this.tree = JSON.parse(JSON.stringify(spec.fs[this.root]));
    this.home = spec.home || this.root;
    this.cwd = spec.cwd || this.root;
  }
  Host.prototype.split = function (p) {
    return p.split("/").filter(function (x) { return x && x !== "."; });
  };
  Host.prototype.resolve = function (p) {
    var parts;
    if (!p || p === "~") parts = this.split(this.home);
    else if (p.charAt(0) === "/") parts = this.split(p);
    else if (p.indexOf("~/") === 0) parts = this.split(this.home).concat(this.split(p.slice(2)));
    else parts = this.split(this.cwd).concat(this.split(p));
    var rootParts = this.split(this.root), out = [];
    parts.forEach(function (seg) {
      if (seg === "..") { if (out.length > rootParts.length) out.pop(); }
      else out.push(seg);
    });
    // Anything that resolves above the root is clamped to the root.
    for (var i = 0; i < rootParts.length; i++) {
      if (out[i] !== rootParts[i]) { out = rootParts.slice(); break; }
    }
    return "/" + out.join("/");
  };
  Host.prototype.node = function (abs) {
    var rootParts = this.split(this.root), parts = this.split(abs);
    var rest = parts.slice(rootParts.length), node = this.tree;
    for (var i = 0; i < rest.length; i++) {
      if (typeof node !== "object" || node === null) return undefined;
      node = node[rest[i]];
      if (node === undefined) return undefined;
    }
    return node;
  };
  Host.prototype.parentOf = function (abs) {
    var i = abs.lastIndexOf("/");
    return { dir: i <= 0 ? this.root : abs.slice(0, i), name: abs.slice(i + 1) };
  };
  Host.prototype.isDir = function (n) { return typeof n === "object" && n !== null; };
  Host.prototype.write = function (abs, content) {
    var p = this.parentOf(abs), d = this.node(p.dir);
    if (!this.isDir(d)) return false;
    d[p.name] = content;
    return true;
  };
  Host.prototype.shortCwd = function () {
    if (this.cwd === this.home) return "~";
    if (this.cwd.indexOf(this.home + "/") === 0) return "~/" + this.cwd.slice(this.home.length + 1);
    return this.cwd;
  };

  // ── command help, used by `help` and `man` ─────────────────────────────
  var HELP = {
    pwd: "pwd - print the directory you are currently in.",
    ls: "ls [-a] [-l] [path] - list what is in a directory. -a also shows hidden entries (names starting with a dot). -l shows one per line with its type.",
    cd: "cd <path> - change directory. `cd ..` goes up one level, `cd ~` goes home, `cd` on its own goes home.",
    cat: "cat <file> - print the whole contents of a file.",
    head: "head [-n N] <file> - print the first N lines of a file (default 10).",
    tail: "tail [-n N] <file> - print the last N lines of a file (default 10).",
    grep: "grep <text> <file> - print the lines of a file that contain some text.",
    find: "find <path> -name <pattern> - search a directory and everything under it for entries whose name matches. Pattern may use *.",
    wc: "wc <file> - count the lines, words and characters in a file.",
    tree: "tree [path] - show a directory and everything under it as an indented tree.",
    echo: "echo <text> - print the text back.",
    clear: "clear - wipe the screen. Your progress is not affected.",
    whoami: "whoami - print the account you are working as.",
    help: "help [command] - list the commands, or explain one of them.",
    man: "man <command> - the same explanation `help <command>` gives.",
    sftp: "sftp <host> - open a file transfer session to a remote host. Inside a session, `ls`/`cd`/`pwd` act on the REMOTE machine and `lls`/`lcd`/`lpwd` act on your own. Leave with `exit`.",
    get: "get <file> - inside an sftp session, copy a file FROM the remote machine to yours.",
    put: "put <file> - inside an sftp session, copy a file FROM your machine to the remote one.",
    lls: "lls [path] - inside an sftp session, list a directory on YOUR machine.",
    lcd: "lcd <path> - inside an sftp session, change directory on YOUR machine.",
    lpwd: "lpwd - inside an sftp session, print the directory you are in on YOUR machine.",
    exit: "exit - leave the sftp session and go back to your own machine."
  };

  // ── the player ─────────────────────────────────────────────────────────
  function mount(container, spec, opts) {
    opts = opts || {};
    var preview = !!opts.preview;
    var conf = cfg();

    injectStyles();

    var hosts = {};
    Object.keys(spec.hosts).forEach(function (h) { hosts[h] = new Host(h, spec.hosts[h]); });
    var local = hosts.local;
    var active = local;            // the host commands currently apply to
    var inSftp = false;

    var state = {
      done: {},                    // check n -> true
      order: [],                   // check numbers in the order they completed
      answers: {},                 // question id -> selected index
      startedAt: Date.now(),
      submitted: false
    };

    // ── layout ───────────────────────────────────────────────────────────
    container.classList.add("apcs-lab");
    container.innerHTML = "";

    var head = el("div", "lab-head");
    head.appendChild(el("h2", "lab-title", spec.title));
    var meta = el("div", "lab-meta");
    if (spec.est_minutes) meta.appendChild(el("span", "lab-chip", spec.est_minutes + " min"));
    meta.appendChild(el("span", "lab-chip", spec.checks.length + " checks"));
    meta.appendChild(el("span", "lab-chip" + (spec.graded ? " lab-chip-on" : ""),
      spec.graded ? spec.points + " points" : "practice, not graded"));
    head.appendChild(meta);
    container.appendChild(head);

    if (preview) {
      container.appendChild(el("div", "lab-banner",
        "Preview. The terminal works exactly as a student's does, and nothing you do here is recorded."));
    } else if (!spec.graded) {
      container.appendChild(el("div", "lab-banner",
        "Practice lab. Your work is checked here on the page and no grade is recorded for it."));
    }

    var body = el("div", "lab-body");
    var leftPane = el("div", "lab-left");
    var rightPane = el("div", "lab-right");
    body.appendChild(leftPane);
    body.appendChild(rightPane);
    container.appendChild(body);

    // brief
    var brief = el("div", "lab-brief");
    brief.innerHTML = briefHtml(spec.brief || []);
    leftPane.appendChild(brief);

    // questions
    var qWrap = el("div", "lab-questions");
    (spec.questions || []).forEach(function (q) { qWrap.appendChild(questionCard(q)); });
    if ((spec.questions || []).length) leftPane.appendChild(qWrap);

    // checklist
    var checkWrap = el("div", "lab-checks");
    checkWrap.appendChild(el("h3", null, "Checks"));
    var checkNodes = {};
    spec.checks.forEach(function (c) {
      var row = el("div", "lab-check");
      var box = el("span", "lab-box", "");
      row.appendChild(box);
      var lbl = el("span", "lab-check-label", c.label);
      if (c.verify) lbl.appendChild(el("span", "lab-verify-tag", "verify"));
      row.appendChild(lbl);
      checkWrap.appendChild(row);
      checkNodes[c.n] = row;
    });
    leftPane.appendChild(checkWrap);

    // terminal
    var termHead = el("div", "term-head");
    termHead.appendChild(el("span", "term-dots", ""));
    var termName = el("span", "term-name", active.label);
    termHead.appendChild(termName);
    rightPane.appendChild(termHead);

    var screen = el("div", "term-screen");
    var out = el("div", "term-out");
    screen.appendChild(out);
    var line = el("div", "term-line");
    var promptSpan = el("span", "term-prompt", active.promptText);
    var input = el("input", "term-input");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("aria-label", "terminal input");
    line.appendChild(promptSpan);
    line.appendChild(input);
    screen.appendChild(line);
    rightPane.appendChild(screen);

    var foot = el("div", "lab-foot");
    var progress = el("span", "lab-progress", "");
    foot.appendChild(progress);
    var submitBtn = el("button", "lab-submit", spec.graded ? "Submit lab" : "Finish");
    foot.appendChild(submitBtn);
    rightPane.appendChild(foot);
    var status = el("div", "lab-status", "");
    rightPane.appendChild(status);

    screen.addEventListener("click", function () { input.focus(); });

    // ── output ───────────────────────────────────────────────────────────
    function print(text, cls) {
      var n = el("div", "term-row" + (cls ? " " + cls : ""), text);
      out.appendChild(n);
      screen.scrollTop = screen.scrollHeight;
    }
    function printLines(text, cls) {
      String(text).replace(/\n$/, "").split("\n").forEach(function (l) { print(l, cls); });
    }
    function echoCommand(raw) {
      print(active.promptText + " " + raw, "term-echo");
    }
    function refreshPrompt() {
      active.promptText = inSftp
        ? "sftp>"
        : (spec.hosts[active.name].prompt || "$").replace(/:~[^$]*\$$/, ":" + active.shortCwd() + "$");
      promptSpan.textContent = active.promptText;
      termName.textContent = inSftp ? active.label + " (sftp)" : active.label;
    }

    // ── checks ───────────────────────────────────────────────────────────
    function emit(ev) {
      spec.checks.forEach(function (c) {
        if (state.done[c.n]) return;
        if (matches(c.match, ev)) complete(c);
      });
    }
    function matches(m, ev) {
      if (m.event !== ev.event) return false;
      if (m.after != null && !state.done[m.after]) return false;
      if (m.host && ev.host !== m.host) return false;
      if (m.cmd && ev.cmd !== m.cmd) return false;
      if (m.cwd && ev.cwd !== m.cwd) return false;
      if (m.cwdAfter && ev.cwdAfter !== m.cwdAfter) return false;
      if (m.file && ev.file !== m.file) return false;
      if (m.to && ev.to !== m.to) return false;
      if (m.direction && ev.direction !== m.direction) return false;
      if (m.question && ev.question !== m.question) return false;
      if (m.event === "answer" && !ev.ok) return false;
      if (m.topicIn && m.topicIn.indexOf(ev.topic) === -1) return false;
      return true;
    }
    function complete(c) {
      state.done[c.n] = true;
      state.order.push(c.n);
      var row = checkNodes[c.n];
      row.classList.add("done");
      row.querySelector(".lab-box").textContent = "✓";
      print("[check " + c.n + " of " + spec.checks.length + "] " + c.label, "term-check");
      updateProgress();
    }
    function passedCount() { return Object.keys(state.done).length; }
    function updateProgress() {
      var n = passedCount(), total = spec.checks.length;
      progress.textContent = n + " of " + total + " checks";
      progress.className = "lab-progress" + (n === total ? " all" : "");
    }
    updateProgress();

    // ── questions ────────────────────────────────────────────────────────
    function questionCard(q) {
      var card = el("div", "lab-q");
      card.appendChild(el("p", "lab-q-prompt", q.prompt));
      var name = "q-" + q.id + "-" + Math.random().toString(36).slice(2, 8);
      q.options.forEach(function (optText, i) {
        var lab = el("label", "lab-opt");
        var r = el("input");
        r.type = "radio";
        r.name = name;
        r.value = String(i);
        lab.appendChild(r);
        lab.appendChild(el("span", null, optText));
        card.appendChild(lab);
        r.addEventListener("change", function () { state.answers[q.id] = i; });
      });
      var btn = el("button", "lab-q-check", "Check answer");
      var fb = el("div", "lab-q-fb", "");
      btn.addEventListener("click", function () {
        var sel = state.answers[q.id];
        if (sel == null) { fb.textContent = "Pick an option first."; fb.className = "lab-q-fb warn"; return; }
        var ok = sel === q.answer;
        fb.textContent = (ok ? "Correct. " : "Not quite. ") + (ok ? (q.explain || "") : "Read the brief again and try once more.");
        fb.className = "lab-q-fb " + (ok ? "ok" : "no");
        emit({ event: "answer", question: q.id, ok: ok, sel: sel });
      });
      card.appendChild(btn);
      card.appendChild(fb);
      return card;
    }

    // ── the shell ────────────────────────────────────────────────────────
    function listing(node, opts) {
      var names = Object.keys(node).sort();
      if (!opts.all) names = names.filter(function (n) { return n.charAt(0) !== "."; });
      if (!names.length) return "";
      if (opts.long) {
        return names.map(function (n) {
          var isDir = typeof node[n] === "object" && node[n] !== null;
          var size = isDir ? Object.keys(node[n]).length + " entries" : String(node[n]).length + " bytes";
          return (isDir ? "d " : "- ") + pad(n, 28) + size;
        }).join("\n");
      }
      return names.map(function (n) {
        return typeof node[n] === "object" && node[n] !== null ? n + "/" : n;
      }).join("   ");
    }
    function pad(s, n) { while (s.length < n) s += " "; return s; }

    function treeOf(node, prefix) {
      var names = Object.keys(node).sort().filter(function (n) { return n.charAt(0) !== "."; });
      var lines = [];
      names.forEach(function (n, i) {
        var last = i === names.length - 1;
        var isDir = typeof node[n] === "object" && node[n] !== null;
        lines.push(prefix + (last ? "`-- " : "|-- ") + n + (isDir ? "/" : ""));
        if (isDir) lines = lines.concat(treeOf(node[n], prefix + (last ? "    " : "|   ")));
      });
      return lines;
    }

    function findIn(host, absStart, pattern) {
      var rx = new RegExp("^" + pattern.split("*").map(function (p) {
        return p.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      }).join(".*") + "$");
      var hits = [];
      (function walk(node, abs) {
        if (typeof node !== "object" || node === null) return;
        Object.keys(node).sort().forEach(function (n) {
          var child = abs + "/" + n;
          if (rx.test(n)) hits.push(child);
          walk(node[n], child);
        });
      })(host.node(absStart), absStart === "/" ? "" : absStart);
      return hits;
    }

    // One command. Returns nothing; prints and emits.
    function run(raw) {
      var trimmed = raw.trim();
      if (!trimmed) return;
      var tokens = trimmed.match(/"[^"]*"|\S+/g).map(function (t) {
        return t.charAt(0) === '"' ? t.slice(1, -1) : t;
      });
      var cmd = tokens[0];
      var args = tokens.slice(1);
      var flags = { all: false, long: false, n: null };
      var positional = [];
      for (var i = 0; i < args.length; i++) {
        var a = args[i];
        if (a === "-n" && args[i + 1] != null) { flags.n = parseInt(args[++i], 10); }
        else if (a.charAt(0) === "-" && a.length > 1 && a.charAt(1) !== "-") {
          if (a.indexOf("a") > 0) flags.all = true;
          if (a.indexOf("l") > 0) flags.long = true;
        } else if (a === "--help") { flags.help = true; }
        else positional.push(a);
      }

      var cwdBefore = active.cwd;

      // `<cmd> --help` is the same teaching moment as `man <cmd>`.
      if (flags.help && HELP[cmd]) {
        printLines(HELP[cmd]);
        emit({ event: "help", topic: cmd, host: active.name });
        return;
      }

      switch (cmd) {
        case "help":
          if (positional[0] && HELP[positional[0]]) {
            printLines(HELP[positional[0]]);
            emit({ event: "help", topic: positional[0], host: active.name });
          } else if (positional[0]) {
            print("help: no entry for '" + positional[0] + "'", "term-err");
          } else {
            print("Commands available in this lab:");
            printLines("  " + Object.keys(HELP).join("  "));
            print("Try `help ls` for one of them.");
          }
          return;

        case "man":
          if (!positional[0]) { print("man: what manual page do you want?", "term-err"); return; }
          if (!HELP[positional[0]]) { print("man: no manual entry for " + positional[0], "term-err"); return; }
          printLines(HELP[positional[0]]);
          emit({ event: "help", topic: positional[0], host: active.name });
          return;

        case "clear":
          out.innerHTML = "";
          return;

        case "whoami":
          print(inSftp ? "student (connected to " + active.label + ")" : "student");
          return;

        case "hostname":
          print(active.label);
          return;

        case "echo":
          print(positional.join(" "));
          return;

        case "pwd":
        case "lpwd": {
          var h = cmd === "lpwd" ? local : active;
          print(h.cwd);
          emit({ event: "cmd", cmd: "pwd", host: h.name, cwd: h.cwd });
          return;
        }

        case "cd":
        case "lcd": {
          var host = cmd === "lcd" ? local : active;
          var target = host.resolve(positional[0] || host.home);
          var node = host.node(target);
          if (node === undefined) { print(cmd + ": " + (positional[0] || "") + ": No such file or directory", "term-err"); return; }
          if (!host.isDir(node)) { print(cmd + ": " + positional[0] + ": Not a directory", "term-err"); return; }
          host.cwd = target;
          refreshPrompt();
          emit({ event: "cmd", cmd: "cd", host: host.name, cwd: cwdBefore, cwdAfter: target });
          return;
        }

        case "ls":
        case "lls": {
          var lhost = cmd === "lls" ? local : active;
          var abs = lhost.resolve(positional[0] || ".");
          var lnode = lhost.node(abs);
          if (lnode === undefined) { print("ls: cannot access '" + positional[0] + "': No such file or directory", "term-err"); return; }
          if (!lhost.isDir(lnode)) { print(abs.split("/").pop()); return; }
          var text = listing(lnode, flags);
          if (text) printLines(text);
          emit({ event: "cmd", cmd: "ls", host: lhost.name, cwd: lhost.cwd, path: abs });
          return;
        }

        case "tree": {
          var tabs = active.resolve(positional[0] || ".");
          var tnode = active.node(tabs);
          if (!active.isDir(tnode)) { print("tree: not a directory", "term-err"); return; }
          print(tabs);
          treeOf(tnode, "").forEach(function (l) { print(l); });
          emit({ event: "cmd", cmd: "tree", host: active.name, cwd: active.cwd });
          return;
        }

        case "cat":
        case "head":
        case "tail":
        case "wc": {
          if (!positional[0]) { print(cmd + ": missing file operand", "term-err"); return; }
          var fabs = active.resolve(positional[0]);
          var fnode = active.node(fabs);
          if (fnode === undefined) { print(cmd + ": " + positional[0] + ": No such file or directory", "term-err"); return; }
          if (active.isDir(fnode)) { print(cmd + ": " + positional[0] + ": Is a directory", "term-err"); return; }
          var lines = String(fnode).replace(/\n$/, "").split("\n");
          if (cmd === "cat") printLines(fnode);
          else if (cmd === "head") printLines(lines.slice(0, flags.n || 10).join("\n"));
          else if (cmd === "tail") printLines(lines.slice(-(flags.n || 10)).join("\n"));
          else {
            var words = String(fnode).split(/\s+/).filter(Boolean).length;
            print("  " + lines.length + "  " + words + "  " + String(fnode).length + "  " + positional[0]);
          }
          emit({ event: "read", file: fabs.split("/").pop(), path: fabs, host: active.name, cwd: active.cwd });
          emit({ event: "cmd", cmd: cmd, host: active.name, cwd: active.cwd });
          return;
        }

        case "grep": {
          if (positional.length < 2) { print("usage: grep <text> <file>", "term-err"); return; }
          var needle = positional[0];
          var gabs = active.resolve(positional[1]);
          var gnode = active.node(gabs);
          if (gnode === undefined || active.isDir(gnode)) { print("grep: " + positional[1] + ": No such file", "term-err"); return; }
          var hits = String(gnode).split("\n").filter(function (l) { return l.indexOf(needle) !== -1; });
          if (!hits.length) print("");
          hits.forEach(function (l) { print(l); });
          emit({ event: "read", file: gabs.split("/").pop(), path: gabs, host: active.name, cwd: active.cwd });
          emit({ event: "cmd", cmd: "grep", host: active.name, cwd: active.cwd });
          return;
        }

        case "find": {
          var start = active.resolve(positional[0] || ".");
          var nameIdx = args.indexOf("-name");
          var pattern = nameIdx !== -1 ? args[nameIdx + 1] : "*";
          if (!pattern) { print("find: -name needs a pattern", "term-err"); return; }
          var found = findIn(active, start, pattern);
          if (!found.length) print("");
          found.forEach(function (f) { print(f); });
          emit({ event: "cmd", cmd: "find", host: active.name, cwd: active.cwd });
          return;
        }

        case "sftp": {
          if (inSftp) { print("sftp: already connected. Use exit first.", "term-err"); return; }
          var wanted = positional[0];
          var remote = hosts.remote;
          if (!remote) { print("sftp: this lab has no remote host", "term-err"); return; }
          var hostname = spec.hosts.remote.hostname || remote.label;
          if (!wanted) { print("usage: sftp <host>", "term-err"); return; }
          if (wanted !== hostname && wanted !== remote.label) {
            print("ssh: Could not resolve hostname " + wanted, "term-err");
            return;
          }
          inSftp = true;
          active = remote;
          print("Connected to " + hostname + ".");
          print("Remote working directory: " + remote.cwd);
          refreshPrompt();
          emit({ event: "sftp-open", host: "remote" });
          return;
        }

        case "exit":
        case "bye":
        case "quit": {
          if (!inSftp) { print("Nothing to exit. You are on your own machine.", "term-err"); return; }
          inSftp = false;
          active = local;
          print("Disconnected.");
          refreshPrompt();
          return;
        }

        case "get":
        case "put": {
          if (!inSftp) { print(cmd + ": not connected. Open a session with sftp first.", "term-err"); return; }
          if (!positional[0]) { print("usage: " + cmd + " <file>", "term-err"); return; }
          var remoteHost = hosts.remote;
          var src = cmd === "put" ? local : remoteHost;
          var dst = cmd === "put" ? remoteHost : local;
          var sabs = src.resolve(positional[0]);
          var snode = src.node(sabs);
          if (snode === undefined) {
            print(cmd + ": " + positional[0] + ": No such file on the " + (cmd === "put" ? "local" : "remote") + " machine", "term-err");
            return;
          }
          if (src.isDir(snode)) { print(cmd + ": " + positional[0] + " is a directory", "term-err"); return; }
          var fname = sabs.split("/").pop();
          dst.write(dst.cwd + "/" + fname, snode);
          print((cmd === "put" ? "Uploading " : "Fetching ") + sabs + " to " + dst.cwd + "/" + fname);
          print(fname + "   100%   " + String(snode).length + " bytes");
          emit({
            event: "transfer", direction: cmd, file: fname,
            from: sabs, to: dst.cwd, host: dst.name
          });
          return;
        }

        default:
          print(cmd + ": command not found. Type `help` for the list.", "term-err");
      }
    }

    // ── input handling ───────────────────────────────────────────────────
    var history = [], hIndex = -1;
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var raw = input.value;
        input.value = "";
        echoCommand(raw);
        if (raw.trim()) { history.push(raw); hIndex = history.length; }
        try { run(raw); } catch (err) {
          print("The lab hit an internal error running that. Nothing is broken; try another command.", "term-err");
          try { console.error("[lab]", err); } catch (e2) {}
        }
        screen.scrollTop = screen.scrollHeight;
      } else if (e.key === "ArrowUp") {
        if (hIndex > 0) { hIndex--; input.value = history[hIndex]; }
        e.preventDefault();
      } else if (e.key === "ArrowDown") {
        if (hIndex < history.length - 1) { hIndex++; input.value = history[hIndex]; }
        else { hIndex = history.length; input.value = ""; }
        e.preventDefault();
      } else if (e.key === "Tab") {
        e.preventDefault();
        var parts = input.value.split(/\s+/);
        var frag = parts[parts.length - 1] || "";
        var pool = parts.length === 1 ? Object.keys(HELP)
          : Object.keys(active.node(active.cwd) || {});
        var hits = pool.filter(function (n) { return n.indexOf(frag) === 0; });
        if (hits.length === 1) {
          parts[parts.length - 1] = hits[0];
          input.value = parts.join(" ");
        } else if (hits.length > 1) {
          print(active.promptText + " " + input.value, "term-echo");
          print(hits.join("   "));
        }
      }
    });

    // ── submit ───────────────────────────────────────────────────────────
    submitBtn.addEventListener("click", function () {
      var score = passedCount(), total = spec.checks.length;
      if (state.submitted) { setStatus("Already submitted. Your grade of record is unchanged unless retries are on.", "warn"); return; }

      if (!spec.graded || preview) {
        setStatus(
          (preview ? "Preview: nothing recorded. " : "Practice lab: nothing recorded. ")
          + "You completed " + score + " of " + total + " checks.",
          score === total ? "ok" : "warn"
        );
        return;
      }
      var token = conf.getToken();
      if (!token) {
        setStatus("You are not signed in, so this cannot be saved. Sign in and submit again; your checks stay ticked.", "no");
        return;
      }
      submitBtn.disabled = true;
      setStatus("Saving...", "warn");

      // The ONLY thing that leaves this page: which checks passed. No command
      // line, no filesystem state, no typed string of any kind.
      var detail = spec.checks.map(function (c) {
        return { q: c.n, sel: null, ok: !!state.done[c.n] };
      });

      fetch((conf.base || "") + "/api/progress/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          course: spec.course,
          lesson_id: spec.lesson_id,
          item_id: spec.item_id,
          item_type: spec.item_type,
          score: score,
          max_score: spec.points,
          duration_seconds: Math.min(86400, Math.round((Date.now() - state.startedAt) / 1000)),
          detail: detail
        })
      }).then(function (r) {
        return r.json().then(function (j) { return { ok: r.ok, body: j }; });
      }).then(function (res) {
        submitBtn.disabled = false;
        if (!res.ok) {
          setStatus(res.body.student_message || res.body.error || "That did not save. Try again in a moment.", "no");
          return;
        }
        state.submitted = true;
        var gor = res.body.grade_of_record || {};
        setStatus(
          "Saved. " + score + " of " + total + " checks"
          + (res.body.passed ? ", passed." : ".")
          + (gor.score != null ? " Grade of record: " + gor.score + " of " + gor.max_score + "." : ""),
          res.body.passed ? "ok" : "warn"
        );
      }).catch(function () {
        submitBtn.disabled = false;
        setStatus("Could not reach the server. Your checks are still ticked; try submitting again.", "no");
      });
    });

    function setStatus(text, kind) {
      status.textContent = text;
      status.className = "lab-status " + (kind || "");
    }

    // ── first paint ──────────────────────────────────────────────────────
    refreshPrompt();
    print("Type `help` to see what this terminal understands.", "term-dim");
    print("");
    setTimeout(function () { input.focus(); }, 50);

    // The handle. `run` and `answer` are what smoke/labs.js drives: it plays
    // each spec's `solution` against this exact code and fails if every check
    // does not tick, so an unfinishable lab cannot ship.
    return {
      state: state,
      run: run,
      answer: function (qid, index) {
        var q = (spec.questions || []).find(function (x) { return x.id === qid; });
        if (!q) return false;
        var ok = index === q.answer;
        state.answers[qid] = index;
        emit({ event: "answer", question: qid, ok: ok, sel: index });
        return ok;
      },
      checks: spec.checks,
      passed: passedCount
    };
  }

  // ── fetch a spec and mount it ────────────────────────────────────────────
  function mountById(container, course, itemId, opts) {
    var conf = cfg();
    return fetch((conf.base || "") + "/api/labs/" + encodeURIComponent(course) + "/" + encodeURIComponent(itemId))
      .then(function (r) {
        if (!r.ok) throw new Error("lab " + course + "/" + itemId + " not found");
        return r.json();
      })
      .then(function (spec) { return mount(container, spec, opts); })
      .catch(function (e) {
        container.textContent = "This lab could not be loaded. " + e.message;
        throw e;
      });
  }

  // ── styles ───────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("apcs-lab-styles")) return;
    var s = document.createElement("style");
    s.id = "apcs-lab-styles";
    s.textContent = [
      ".apcs-lab{--ink:#12212e;--muted:#5a6b7a;--line:#e9d5ff;--bg:#fff;--accent:#6B21A8;--ok:#1a7f4b;--no:#b3261e;",
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);",
      "border:1px solid var(--line);border-radius:10px;overflow:hidden;max-width:1200px;margin:0 auto}",
      ".apcs-lab *{box-sizing:border-box}",
      ".lab-head{padding:14px 18px;border-bottom:1px solid var(--line)}",
      ".lab-title{margin:0 0 6px;font-size:20px;line-height:1.25}",
      ".lab-meta{display:flex;gap:8px;flex-wrap:wrap}",
      ".lab-chip{font-size:12px;padding:3px 9px;border-radius:999px;background:#F5F0FF;color:var(--muted)}",
      ".lab-chip-on{background:#e6f3ec;color:var(--ok)}",
      ".lab-banner{padding:10px 18px;background:#fff8e1;border-bottom:1px solid #f0e0a8;font-size:13px;color:#6a5300}",
      ".lab-body{display:flex;flex-wrap:wrap;align-items:stretch}",
      ".lab-left{flex:1 1 380px;min-width:320px;padding:18px;border-right:1px solid var(--line)}",
      ".lab-right{flex:1 1 460px;min-width:320px;padding:18px;display:flex;flex-direction:column;gap:10px}",
      ".lab-brief p{margin:0 0 10px;line-height:1.55;font-size:15px}",
      ".lab-brief ol{margin:0 0 12px;padding-left:22px}",
      ".lab-brief li{margin:4px 0;line-height:1.5}",
      ".lab-brief code,.lab-q code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#F5F0FF;padding:1px 5px;border-radius:4px;font-size:13px}",
      ".lab-q{border:1px solid var(--line);border-radius:8px;padding:12px;margin:12px 0}",
      ".lab-q-prompt{margin:0 0 8px;font-weight:600;line-height:1.45}",
      ".lab-opt{display:flex;gap:8px;align-items:flex-start;margin:5px 0;line-height:1.45;cursor:pointer}",
      ".lab-q-check{margin-top:8px;font-size:13px;padding:6px 12px;border:1px solid var(--accent);color:var(--accent);",
      "background:#fff;border-radius:6px;cursor:pointer}",
      ".lab-q-fb{margin-top:8px;font-size:13px;line-height:1.45}",
      ".lab-q-fb.ok{color:var(--ok)}.lab-q-fb.no{color:var(--no)}.lab-q-fb.warn{color:#8a6d00}",
      ".lab-checks{margin-top:18px;border-top:1px solid var(--line);padding-top:14px}",
      ".lab-checks h3{margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}",
      ".lab-check{display:flex;gap:10px;align-items:flex-start;margin:7px 0;font-size:14px;line-height:1.45;color:var(--muted)}",
      ".lab-check.done{color:var(--ok)}",
      ".lab-box{flex:0 0 18px;height:18px;border:1px solid var(--line);border-radius:4px;display:inline-flex;",
      "align-items:center;justify-content:center;font-size:12px;margin-top:1px}",
      ".lab-check.done .lab-box{border-color:var(--ok);background:#e6f3ec}",
      ".lab-verify-tag{font-size:10px;text-transform:uppercase;letter-spacing:.05em;margin-left:7px;padding:1px 6px;",
      "border-radius:999px;background:#F5F0FF;color:var(--muted);vertical-align:middle}",
      ".term-head{background:#2b3440;border-radius:8px 8px 0 0;padding:7px 12px;display:flex;align-items:center;gap:10px}",
      ".term-dots{width:44px;height:10px;background:",
      "radial-gradient(circle 5px at 5px 5px,#ff5f57 98%,transparent),",
      "radial-gradient(circle 5px at 22px 5px,#febc2e 98%,transparent),",
      "radial-gradient(circle 5px at 39px 5px,#28c840 98%,transparent)}",
      ".term-name{color:#c8d3de;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}",
      ".term-screen{background:#0d1117;color:#d7e0ea;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;",
      "font-size:13px;line-height:1.5;padding:12px;height:430px;overflow-y:auto;border-radius:0 0 8px 8px;cursor:text}",
      ".term-row{white-space:pre-wrap;word-break:break-word}",
      ".term-echo{color:#9fb4c7}.term-err{color:#ff8a80}.term-dim{color:#7c8a99}",
      ".term-check{color:#6ee7a8}",
      ".term-line{display:flex;gap:8px;align-items:baseline;margin-top:2px}",
      ".term-prompt{color:#6ee7a8;white-space:pre}",
      ".term-input{flex:1;background:transparent;border:0;outline:0;color:#d7e0ea;font:inherit;padding:0}",
      ".lab-foot{display:flex;align-items:center;justify-content:space-between;gap:12px}",
      ".lab-progress{font-size:13px;color:var(--muted)}.lab-progress.all{color:var(--ok);font-weight:600}",
      ".lab-submit{background:var(--accent);color:#fff;border:0;border-radius:6px;padding:9px 18px;font-size:14px;cursor:pointer}",
      ".lab-submit:disabled{opacity:.6;cursor:default}",
      ".lab-status{font-size:13px;min-height:18px;line-height:1.45}",
      ".lab-status.ok{color:var(--ok)}.lab-status.no{color:var(--no)}.lab-status.warn{color:#8a6d00}",
      "@media (max-width:820px){.lab-left{border-right:0;border-bottom:1px solid var(--line)}.term-screen{height:320px}}"
    ].join("");
    document.head.appendChild(s);
  }

  global.APCSLab = { mount: mount, mountById: mountById };
})(typeof window !== "undefined" ? window : this);
