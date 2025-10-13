// Service worker: schedules reminder alarms and coordinates persistence.
const ALARM_NAME = "accomplishment-reminder";
const DEFAULT_INTERVAL_MINUTES = 15;
const PROMPT_WINDOW_SIZE = { width: 420, height: 520 };

let activeReminderWindowId = null;

const storageGet = (keys) =>
  new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });

const storageSet = (items) =>
  new Promise((resolve) => {
    chrome.storage.local.set(items, resolve);
  });

const ensureInitialized = async () => {
  const { reminderIntervalMinutes, entries } = await storageGet([
    "reminderIntervalMinutes",
    "entries"
  ]);

  const updates = {};
  let interval = reminderIntervalMinutes;

  if (typeof interval !== "number" || Number.isNaN(interval) || interval <= 0) {
    interval = DEFAULT_INTERVAL_MINUTES;
    updates.reminderIntervalMinutes = interval;
  }

  if (!entries || typeof entries !== "object") {
    updates.entries = {};
  }

  if (Object.keys(updates).length > 0) {
    await storageSet(updates);
  }

  await scheduleReminder(interval);
};

const scheduleReminder = async (minutes) => {
  const interval = Math.max(1, Number.isFinite(minutes) ? Number(minutes) : DEFAULT_INTERVAL_MINUTES);
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, {
    delayInMinutes: interval,
    periodInMinutes: interval
  });
};

const getTodayKey = () => {
  const now = new Date();
  return now.toISOString().split("T")[0];
};

const openReminderWindow = async () => {
  if (activeReminderWindowId !== null) {
    try {
      await chrome.windows.get(activeReminderWindowId);
      await chrome.windows.update(activeReminderWindowId, { focused: true });
      return;
    } catch (error) {
      activeReminderWindowId = null;
    }
  }

  const url = chrome.runtime.getURL("reminder.html");
  const createdWindow = await chrome.windows.create({
    url,
    type: "popup",
    width: PROMPT_WINDOW_SIZE.width,
    height: PROMPT_WINDOW_SIZE.height,
    focused: true
  });

  activeReminderWindowId = createdWindow.id ?? null;
};

const saveAccomplishment = async (items) => {
  const trimmedItems = items
    .map((entry) => (entry || "").trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 3);

  if (trimmedItems.length === 0) {
    throw new Error("please add at least one accomplishment.");
  }

  const { entries = {} } = await storageGet(["entries"]);
  const now = new Date();
  const dayKey = getTodayKey();
  const dayEntries = Array.isArray(entries[dayKey]) ? entries[dayKey] : [];

  trimmedItems.forEach((note) => {
    dayEntries.push({
      timestamp: now.toISOString(),
      note
    });
  });

  entries[dayKey] = dayEntries;
  await storageSet({ entries });
};

const resetEntries = async () => {
  await storageSet({ entries: {} });
};

chrome.runtime.onInstalled.addListener(() => {
  ensureInitialized();
});

chrome.runtime.onStartup.addListener(() => {
  ensureInitialized();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    openReminderWindow();
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === activeReminderWindowId) {
    activeReminderWindowId = null;
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const respond = (payload) => {
    sendResponse(payload);
  };

  (async () => {
    try {
      switch (message?.type) {
        case "saveAccomplishment":
          await saveAccomplishment(message.items ?? []);
          respond({ success: true });
          break;
        case "updateInterval":
          {
            const requested = Number(message.minutes);
            const sanitized = Math.min(1440, Math.max(1, Math.round(requested)));
            await storageSet({
              reminderIntervalMinutes: sanitized
            });
            await scheduleReminder(sanitized);
            respond({ success: true, minutes: sanitized });
          }
          break;
        case "resetEntries":
          await resetEntries();
          respond({ success: true });
          break;
        case "openReminder":
          await openReminderWindow();
          respond({ success: true });
          break;
        case "getInterval":
          {
            const { reminderIntervalMinutes } = await storageGet(["reminderIntervalMinutes"]);
            respond({
              success: true,
              minutes: reminderIntervalMinutes ?? DEFAULT_INTERVAL_MINUTES
            });
          }
          break;
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
