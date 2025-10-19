// Service worker: schedules reminder alarms and coordinates persistence.
const ALARM_NAME = "accomplishment-reminder";
const DEFAULT_INTERVAL_MINUTES = 15;
const PROMPT_WINDOW_SIZE = { width: 420, height: 520 };
const ACTIVE_WINDOW_STORAGE_KEY = "activeReminderWindowId";

let activeReminderWindowId = null;
let isActiveReminderWindowLoaded = false;

// ---- Storage helpers ----
const storageGet = (keys) =>
  new Promise((resolve) => chrome.storage.local.get(keys, resolve));

const storageSet = (items) =>
  new Promise((resolve) => chrome.storage.local.set(items, resolve));

const storageRemove = (keys) =>
  new Promise((resolve) => chrome.storage.local.remove(keys, resolve));

const isMissingWindowError = (error) => {
  if (!error || typeof error.message !== "string") return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("no window with id") ||
    message.includes("invalid window id")
  );
};

const setActiveReminderWindowId = async (windowId) => {
  if (typeof windowId === "number") {
    activeReminderWindowId = windowId;
    isActiveReminderWindowLoaded = true;
    await storageSet({ [ACTIVE_WINDOW_STORAGE_KEY]: windowId });
  } else {
    activeReminderWindowId = null;
    isActiveReminderWindowLoaded = true;
    await storageRemove([ACTIVE_WINDOW_STORAGE_KEY]);
  }
};

const resolveActiveReminderWindowId = async () => {
  if (typeof activeReminderWindowId === "number") return activeReminderWindowId;

  if (!isActiveReminderWindowLoaded) {
    const { [ACTIVE_WINDOW_STORAGE_KEY]: storedId } = await storageGet([
      ACTIVE_WINDOW_STORAGE_KEY,
    ]);
    activeReminderWindowId = typeof storedId === "number" ? storedId : null;
    isActiveReminderWindowLoaded = true;
  }

  return activeReminderWindowId;
};

const ensureReminderWindowBounds = async (windowId, { focus = false } = {}) => {
  if (typeof windowId !== "number") return false;

  const fetchWindowInfo = async () => {
    try {
      return await chrome.windows.get(windowId);
    } catch (error) {
      if (isMissingWindowError(error)) return null;
      throw error;
    }
  };

  const applyUpdate = async (options) => {
    const keys = Object.keys(options);
    if (keys.length === 0) return false;
    await chrome.windows.update(windowId, options);
    return true;
  };

  try {
    let windowInfo = await fetchWindowInfo();
    if (!windowInfo) return false;

    const stateOptions = {};
    if (
      windowInfo.state === "fullscreen" ||
      windowInfo.state === "maximized" ||
      windowInfo.state !== "normal"
    ) {
      stateOptions.state = "normal";
    }
    if (focus) stateOptions.focused = true;

    const stateChanged = await applyUpdate(stateOptions);
    if (stateChanged) {
      const refreshedInfo = await fetchWindowInfo();
      if (!refreshedInfo) return false;
      windowInfo = refreshedInfo;
    }

    const sizeOptions = {};
    if (windowInfo.width !== PROMPT_WINDOW_SIZE.width)
      sizeOptions.width = PROMPT_WINDOW_SIZE.width;
    if (windowInfo.height !== PROMPT_WINDOW_SIZE.height)
      sizeOptions.height = PROMPT_WINDOW_SIZE.height;
    if (focus && !("focused" in sizeOptions)) sizeOptions.focused = true;

    await applyUpdate(sizeOptions);

    if (!stateChanged && Object.keys(sizeOptions).length === 0 && focus) {
      await applyUpdate({ focused: true });
    }

    return true;
  } catch (error) {
    if (isMissingWindowError(error)) return false;
    throw error;
  }
};

// ---- Initialization & scheduling ----
const ensureInitialized = async () => {
  const { reminderIntervalMinutes, entries } = await storageGet([
    "reminderIntervalMinutes",
    "entries",
  ]);

  const updates = {};
  let interval = reminderIntervalMinutes;

  if (typeof interval !== "number" || Number.isNaN(interval) || interval <= 0) {
    interval = DEFAULT_INTERVAL_MINUTES;
    updates.reminderIntervalMinutes = interval;
  }

  if (!entries || typeof entries !== "object") updates.entries = {};

  if (Object.keys(updates).length > 0) await storageSet(updates);

  await scheduleReminder(interval);
};

const scheduleReminder = async (minutes) => {
  const interval = Math.max(
    1,
    Number.isFinite(minutes) ? Number(minutes) : DEFAULT_INTERVAL_MINUTES
  );
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: interval,
    periodInMinutes: interval,
  });
};

// ---- Core behavior ----
const getTodayKey = () => new Date().toISOString().split("T")[0];

const openReminderWindow = async () => {
  const existingWindowId = await resolveActiveReminderWindowId();
  if (typeof existingWindowId === "number") {
    const reused = await ensureReminderWindowBounds(existingWindowId, {
      focus: true,
    });
    if (reused) return;
    await setActiveReminderWindowId(null);
  }

  const url = chrome.runtime.getURL("reminder.html");
  const createdWindow = await chrome.windows.create({
    url,
    type: "popup",
    focused: true,
    width: PROMPT_WINDOW_SIZE.width,
    height: PROMPT_WINDOW_SIZE.height,
    state: "normal",
  });

  const createdWindowId =
    typeof createdWindow.id === "number" ? createdWindow.id : null;

  if (createdWindowId !== null) {
    await setActiveReminderWindowId(createdWindowId);
    const resized = await ensureReminderWindowBounds(createdWindowId, {
      focus: true,
    });
    if (!resized) await setActiveReminderWindowId(null);
  } else {
    await setActiveReminderWindowId(null);
  }
};

const saveAccomplishment = async (items) => {
  const trimmedItems = items
    .map((entry) => (entry || "").trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 3);

  if (trimmedItems.length === 0)
    throw new Error("please add at least one accomplishment.");

  const { entries = {} } = await storageGet(["entries"]);
  const now = new Date();
  const dayKey = getTodayKey();
  const dayEntries = Array.isArray(entries[dayKey]) ? entries[dayKey] : [];

  trimmedItems.forEach((note) => {
    dayEntries.push({ timestamp: now.toISOString(), note });
  });

  entries[dayKey] = dayEntries;
  await storageSet({ entries });
};

const resetEntries = async () => storageSet({ entries: {} });

// ---- Event listeners ----
chrome.runtime.onInstalled.addListener(() => ensureInitialized());
chrome.runtime.onStartup.addListener(() => ensureInitialized());

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) openReminderWindow();
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === activeReminderWindowId) {
    setActiveReminderWindowId(null).catch(() => {});
    return;
  }

  if (!isActiveReminderWindowLoaded) {
    resolveActiveReminderWindowId()
      .then((resolvedId) => {
        if (windowId === resolvedId) {
          setActiveReminderWindowId(null).catch(() => {});
        }
      })
      .catch(() => {});
  }
});

// 🔒 Whenever user resizes or fullscreen toggles, force back to 420x520 normal
chrome.windows.onBoundsChanged.addListener((windowId) => {
  resolveActiveReminderWindowId()
    .then((resolvedId) => {
      if (windowId === resolvedId) {
        return ensureReminderWindowBounds(windowId);
      }
    })
    .catch(() => {});
});

// Also catch focus-based fullscreen restoration
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  const activeId = await resolveActiveReminderWindowId();
  if (windowId === activeId) {
    await ensureReminderWindowBounds(windowId);
  }
});

// ---- Message handling ----
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const respond = (payload) => sendResponse(payload);

  (async () => {
    try {
      switch (message?.type) {
        case "saveAccomplishment":
          await saveAccomplishment(message.items ?? []);
          respond({ success: true });
          break;
        case "updateInterval": {
          const requested = Number(message.minutes);
          const sanitized = Math.min(1440, Math.max(1, Math.round(requested)));
          await storageSet({ reminderIntervalMinutes: sanitized });
          await scheduleReminder(sanitized);
          respond({ success: true, minutes: sanitized });
          break;
        }
        case "resetEntries":
          await resetEntries();
          respond({ success: true });
          break;
        case "openReminder":
          await openReminderWindow();
          respond({ success: true });
          break;
        case "getInterval": {
          const { reminderIntervalMinutes } = await storageGet([
            "reminderIntervalMinutes",
          ]);
          respond({
            success: true,
            minutes: reminderIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES,
          });
          break;
        }
        default:
          respond({ success: false, error: "Unknown request." });
          break;
      }
    } catch (error) {
      respond({ success: false, error: error.message });
    }
  })();

  return true;
});
