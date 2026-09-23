const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function event() {
  const listeners = [];
  return {
    addListener(listener) { listeners.push(listener); },
    fire(...args) { listeners.forEach((listener) => listener(...args)); }
  };
}

function setup() {
  const removed = [];
  const onConnect = event();
  const chrome = {
    runtime: { onConnect },
    tabs: {
      remove(id) {
        removed.push(id);
        return id === 99 ? Promise.reject(new Error("Tab already closed")) : Promise.resolve();
      },
      query: async () => []
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../background.js"), "utf8"), {
    chrome, console: { warn() {} }
  });
  function connect() {
    const port = { name: "tab-close-queue", onMessage: event(), onDisconnect: event() };
    port.postMessage = (message) => port.onMessage.fire(message);
    onConnect.fire(port);
    return port;
  }
  return { chrome, removed, connect };
}

test("queues until dismissal, deduplicates, and continues past already-closed tabs", async () => {
  const { removed, connect } = setup();
  const port = connect();
  for (const tabId of [1, 99, 2, 1, -1, "3"]) port.postMessage({ type: "queue-close", tabId });
  port.postMessage({ type: "keep-alive" });
  assert.deepEqual(removed, []);
  port.onDisconnect.fire();
  await Promise.resolve();
  assert.deepEqual(removed, [1, 99, 2]);
  port.onDisconnect.fire();
  assert.deepEqual(removed, [1, 99, 2]);
});

test("popup queues are independent, including empty dismissals", () => {
  const { removed, connect } = setup();
  const first = connect();
  const second = connect();
  first.postMessage({ type: "queue-close", tabId: 1 });
  second.postMessage({ type: "queue-close", tabId: 2 });
  connect().onDisconnect.fire();
  assert.deepEqual(removed, []);
  first.onDisconnect.fire();
  assert.deepEqual(removed, [1]);
  second.onDisconnect.fire();
  assert.deepEqual(removed, [1, 2]);
});

for (const undo of [null, "click", "auxclick"]) {
test(`queued row stays visible; undo via ${undo || "no undo"}`, async () => {
  const { chrome, removed, connect } = setup();
  const port = connect();
  chrome.runtime.connect = () => port;
  const handlers = {};
  const list = {
    childElementCount: 0,
    addEventListener(type, handler) { handlers[type] = handler; },
    replaceChildren() {}
  };
  const count = {};
  const status = {};
  const document = {
    querySelector: (selector) => ({ "#tab-list": list, "#tab-count": count, "#status": status })[selector],
    documentElement: { style: { setProperty() {} } },
    addEventListener() {},
    createDocumentFragment: () => ({ append() {} })
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../popup.js"), "utf8"), {
    chrome, document, window: { addEventListener() {} },
    screen: { availWidth: 1920, availHeight: 1080 },
    setInterval() {}, clearInterval() {}
  });
  await Promise.resolve();
  list.childElementCount = 1;
  const button = {
    dataset: { tabId: "42" },
    classList: { toggle(name, value) { button.queued = value; } },
    querySelector: () => ({ textContent: "Example tab" }),
    setAttribute(name, value) { this[name] = value; },
    removeAttribute(name) { delete this[name]; }
  };
  const clickEvent = { button: 1, target: { closest: () => button }, preventDefault() {} };
  handlers.auxclick(clickEvent);
  assert.equal(list.childElementCount, 1);
  assert.equal(button.queued, true);
  assert.match(button["aria-label"], /Queued to close/);
  assert.equal(count.textContent, "1 tab · 1 queued");
  if (undo) {
    await handlers[undo](clickEvent);
    assert.equal(button.queued, false);
    assert.equal(button.title, "Example tab");
    assert.equal(button["aria-label"], undefined);
    assert.equal(count.textContent, "1 tab");
  }
  assert.deepEqual(removed, []);
  port.onDisconnect.fire();
  assert.deepEqual(removed, undo ? [] : [42]);
});
}

test("cancelled tabs can be queued again before dismissal", () => {
  const { removed, connect } = setup();
  const port = connect();
  for (const type of ["queue-close", "cancel-close", "queue-close"]) {
    port.postMessage({ type, tabId: 42 });
  }
  assert.deepEqual(removed, []);
  port.onDisconnect.fire();
  assert.deepEqual(removed, [42]);
});
