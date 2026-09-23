chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "tab-close-queue") return;

  // Each popup owns its queue; unloading it disconnects its port.
  const pendingTabIds = new Set();
  port.onMessage.addListener((message) => {
    if (message.type === "queue-close" && Number.isInteger(message.tabId) && message.tabId >= 0) {
      pendingTabIds.add(message.tabId);
    } else if (message.type === "cancel-close") {
      pendingTabIds.delete(message.tabId);
    }
  });

  port.onDisconnect.addListener(() => {
    for (const tabId of pendingTabIds) {
      // Remove independently so an already-closed tab cannot block the rest.
      chrome.tabs.remove(tabId).catch((error) => {
        console.warn(`Could not close queued tab ${tabId}:`, error);
      });
    }
    pendingTabIds.clear();
  });
});
