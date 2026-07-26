/**
 * A stand-in for the yap server, just complete enough to boot the app.
 *
 * The scroll tests care about *when* content arrives, which the real server
 * can't be asked for: message timing there depends on Postgres and on whatever
 * Ollama feels like emitting. So the SSE stream here is driven by a control
 * endpoint the tests POST to, and every assertion about following/unfollowing
 * becomes deterministic.
 *
 * Only the handful of endpoints the app hits on mount are implemented. Anything
 * else returns an empty array rather than 404, so an unrelated panel fetching
 * something new doesn't break a scroll test.
 */
import { createServer } from "node:http";

const PORT = Number(process.env.STUB_PORT ?? 4319);

/** Live SSE writers, keyed by conversation id. */
const streams = new Map();
let seq = 0;

const AGENT = { id: "a-1", name: "Reviewer", initial: "R", desc: "", model: "m", tools: 2, temp: 0.5 };

/** A thread long enough that the viewport must scroll to reach the end. */
function makeNodes(count) {
  const nodes = {};
  let parent = null;
  for (let i = 1; i <= count; i++) {
    const id = `n-${String(i).padStart(2, "0")}`;
    const role = i % 2 === 1 ? "user" : "asst";
    nodes[id] = {
      id,
      parent,
      role,
      time: "11:0" + (i % 10),
      branch: "main",
      // Long enough that a handful of messages overflow any test viewport.
      content:
        `Message ${i}. ` +
        "This paragraph exists to give the thread real height so scrolling is genuine. ".repeat(4),
    };
    parent = id;
  }
  return { nodes, leaf: parent };
}

const SEED_COUNT = 10;
const seeded = makeNodes(SEED_COUNT);
const state = {
  nodes: { ...seeded.nodes },
  activeLeaf: seeded.leaf,
  rootId: "n-01",
};

function json(res, body, status = 200) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
  });
  res.end(payload);
}

function conversationBody(id) {
  return {
    id,
    title: "Scroll fixture",
    agent: AGENT.name,
    tag: "work",
    updated: "11:00",
    folder: "Today",
    tokens_used: 10,
    token_budget: 1000,
    root_node_id: state.rootId,
    active_leaf_id: state.activeLeaf,
    tree: { rootId: state.rootId, activeLeaf: state.activeLeaf, nodes: state.nodes },
  };
}

function push(convId, event) {
  const writer = streams.get(convId);
  if (!writer) return false;
  const withId = { id: `ev-${++seq}`, at: Date.now(), conversation_id: convId, ...event };
  writer.write(`event: ${withId.kind}\nid: ${withId.id}\ndata: ${JSON.stringify(withId)}\n\n`);
  return true;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const path = url.pathname.replace(/^\/api\/v1/, "");

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    });
    return res.end();
  }

  // -- test control: append a whole message, or grow the tail one ----------
  if (path === "/__test/append" && req.method === "POST") {
    const id = `n-new-${++seq}`;
    const convId = url.searchParams.get("conv") ?? "c-1";
    state.nodes[id] = {
      id,
      parent: state.activeLeaf,
      role: "asst",
      time: "11:59",
      branch: "main",
      content: "A brand new assistant message. " + "Padding to give it height. ".repeat(6),
    };
    state.activeLeaf = id;
    push(convId, { kind: "node.created", node: state.nodes[id] });
    push(convId, { kind: "active_leaf.changed", active_leaf_id: id });
    return json(res, { ok: true, id });
  }

  if (path === "/__test/grow" && req.method === "POST") {
    const convId = url.searchParams.get("conv") ?? "c-1";
    const target = state.nodes[state.activeLeaf];
    const delta = " " + "streamed text ".repeat(12);
    target.content += delta;
    push(convId, { kind: "content.delta", node_id: target.id, delta });
    return json(res, { ok: true });
  }

  if (path === "/__test/ready") return json(res, { streams: [...streams.keys()] });

  // -- SSE stream ----------------------------------------------------------
  const streamMatch = path.match(/^\/conversations\/([^/]+)\/stream$/);
  if (streamMatch) {
    const convId = streamMatch[1];
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(": connected\n\n");
    streams.set(convId, res);
    req.on("close", () => {
      if (streams.get(convId) === res) streams.delete(convId);
    });
    return;
  }

  // -- REST ----------------------------------------------------------------
  if (path === "/conversations" && req.method === "GET") {
    return json(res, [
      { id: "c-1", title: "Scroll fixture", snippet: "…", agent: AGENT.name, tag: "work", updated: "11:00", folder: "Today" },
      { id: "c-2", title: "Second thread", snippet: "…", agent: AGENT.name, tag: "work", updated: "10:00", folder: "Today" },
    ]);
  }

  const convMatch = path.match(/^\/conversations\/([^/]+)$/);
  if (convMatch && req.method === "GET") return json(res, conversationBody(convMatch[1]));

  if (path === "/tags") return json(res, [{ id: "t-1", name: "work", color: "ochre" }]);
  if (path === "/agents") return json(res, [AGENT]);
  if (path === "/agent-templates") return json(res, []);
  if (path === "/tools") return json(res, []);

  if (path.endsWith("/interject") || path.endsWith("/cancel")) return json(res, { ok: true });

  const msgMatch = path.match(/^\/conversations\/([^/]+)\/messages$/);
  if (msgMatch && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    return req.on("end", () => {
      const parsed = body ? JSON.parse(body) : {};
      const id = `n-user-${++seq}`;
      state.nodes[id] = {
        id,
        parent: state.activeLeaf,
        role: "user",
        time: "12:00",
        branch: "main",
        content: parsed.content ?? "",
      };
      state.activeLeaf = id;
      push(msgMatch[1], { kind: "node.created", node: state.nodes[id] });
      push(msgMatch[1], { kind: "active_leaf.changed", active_leaf_id: id });
      json(res, state.nodes[id], 201);
    });
  }

  // Unknown reads answer emptily so an unrelated panel can't fail a test.
  if (req.method === "GET") return json(res, []);
  return json(res, { ok: true });
});

server.listen(PORT, () => {
  process.stdout.write(`stub-yap listening on http://localhost:${PORT}\n`);
});
