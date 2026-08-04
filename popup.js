const tabList = document.querySelector("#tab-list");
const tabCount = document.querySelector("#tab-count");
const status = document.querySelector("#status");

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
  item.append(button);
  return item;
}

tabList.addEventListener("click", async (event) => {
  const button = event.target.closest(".tab-button");
  if (!button) return;

  try {
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
