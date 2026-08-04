const tabList = document.querySelector("#tab-list");
const tabCount = document.querySelector("#tab-count");
const status = document.querySelector("#status");

window.addEventListener("blur", () => window.close());

// Popup CSS cannot reliably size against the physical screen viewport, so set
// explicit limits before rendering. Browser-enforced popup limits still apply.
document.documentElement.style.setProperty(
  "--popup-width",
  `${Math.max(280, Math.min(420, Math.floor(screen.availWidth * 0.8)))}px`
);
document.documentElement.style.setProperty(
  "--popup-max-height",
  `${Math.max(240, Math.floor(screen.availHeight * 0.8))}px`
);

function makeFavicon(tab) {
  if (!tab.favIconUrl) {
    const fallback = document.createElement("span");
    fallback.className = "favicon favicon-fallback";
    fallback.textContent = "•";
    fallback.setAttribute("aria-hidden", "true");
    return fallback;
  }

  const image = document.createElement("img");
  image.className = "favicon";
  image.src = tab.favIconUrl;
  image.alt = "";
  image.width = 16;
  image.height = 16;
  image.addEventListener("error", () => {
    const fallback = document.createElement("span");
    fallback.className = "favicon favicon-fallback";
    fallback.textContent = "•";
    fallback.setAttribute("aria-hidden", "true");
    image.replaceWith(fallback);
  });
  return image;
}

function makeAudioIndicator(tab) {
  if (!tab.audible && !tab.mutedInfo?.muted) return null;

  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("class", "audio-indicator");
  icon.setAttribute("viewBox", "0 0 20 20");
  icon.setAttribute("aria-label", tab.mutedInfo?.muted ? "Tab is muted" : "Tab is playing audio");
  icon.setAttribute("role", "img");
  icon.dataset.muted = String(Boolean(tab.mutedInfo?.muted));

  const speaker = document.createElementNS("http://www.w3.org/2000/svg", "path");
  speaker.setAttribute("d", "M3 8v4h3l4 3V5L6 8H3z");
  icon.append(speaker);

  const detail = document.createElementNS("http://www.w3.org/2000/svg", "path");
  if (tab.mutedInfo?.muted) {
    detail.setAttribute("d", "m13 8 4 4m0-4-4 4");
  } else {
    detail.setAttribute("d", "M13 7.2a4 4 0 0 1 0 5.6m2-7.6a7 7 0 0 1 0 9.6");
  }
  detail.setAttribute("class", "audio-detail");
  icon.append(detail);
  return icon;
}

function makeTabItem(tab) {
  const item = document.createElement("li");
  const button = document.createElement("button");
  const title = document.createElement("span");

  button.type = "button";
  button.className = "tab-button";
  button.title = tab.title || tab.url || "Untitled tab";
  button.dataset.tabId = String(tab.id);
  if (tab.active) button.setAttribute("aria-current", "true");

  title.className = "tab-title";
  title.textContent = tab.title || tab.url || "Untitled tab";

  button.append(makeFavicon(tab), title);
  const audioIndicator = makeAudioIndicator(tab);
  if (audioIndicator) button.append(audioIndicator);
  item.append(button);
  return item;
}

tabList.addEventListener("click", async (event) => {
  const button = event.target.closest(".tab-button");
  if (!button) return;

  try {
    const audioIndicator = event.target.closest(".audio-indicator");
    if (audioIndicator) {
      const muted = audioIndicator.dataset.muted === "true";
      await chrome.tabs.update(Number(button.dataset.tabId), { muted: !muted });
      audioIndicator.dataset.muted = String(!muted);
      audioIndicator.setAttribute("aria-label", !muted ? "Tab is muted" : "Tab is playing audio");
      audioIndicator.querySelector(".audio-detail").setAttribute(
        "d",
        !muted ? "m13 8 4 4m0-4-4 4" : "M13 7.2a4 4 0 0 1 0 5.6m2-7.6a7 7 0 0 1 0 9.6"
      );
      return;
    }

    await chrome.tabs.update(Number(button.dataset.tabId), { active: true });
    window.close();
  } catch (error) {
    showError(error);
  }
});

tabList.addEventListener("auxclick", async (event) => {
  if (event.button !== 1) return;
  const button = event.target.closest(".tab-button");
  if (!button) return;

  event.preventDefault();
  try {
    await chrome.tabs.remove(Number(button.dataset.tabId));
    button.closest("li").remove();
    updateCount();
  } catch (error) {
    showError(error);
  }
});

function updateCount() {
  const count = tabList.childElementCount;
  tabCount.textContent = `${count} ${count === 1 ? "tab" : "tabs"}`;
  if (count === 0) {
    status.textContent = "No tabs in this window.";
    status.hidden = false;
  }
}

function showError(error) {
  status.textContent = error?.message || "Something went wrong.";
  status.hidden = false;
}

async function loadTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const fragment = document.createDocumentFragment();
    for (const tab of tabs) fragment.append(makeTabItem(tab));
    tabList.replaceChildren(fragment);
    status.hidden = true;
    updateCount();

    document.querySelector('.tab-button[aria-current="true"]')?.scrollIntoView({
      block: "nearest"
    });
  } catch (error) {
    showError(error);
  }
}

loadTabs();
