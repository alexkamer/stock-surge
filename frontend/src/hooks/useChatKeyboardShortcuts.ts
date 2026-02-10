import { useEffect } from "react";

interface KeyboardShortcutHandlers {
  onNewChat?: () => void;
  onSearch?: () => void;
  onExport?: () => void;
  onFocusInput?: () => void;
}

/**
 * Hook for global keyboard shortcuts in the chat interface
 */
export function useChatKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Get the modifier key based on platform
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Ignore if user is typing in an input/textarea (except for Escape)
      const isInputFocused =
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA";

      // Cmd/Ctrl + K - Focus search
      if (modifier && event.key === "k") {
        event.preventDefault();
        handlers.onSearch?.();
        return;
      }

      // Cmd/Ctrl + N - New chat
      if (modifier && event.key === "n") {
        event.preventDefault();
        handlers.onNewChat?.();
        return;
      }

      // Cmd/Ctrl + E - Export chat
      if (modifier && event.key === "e") {
        event.preventDefault();
        handlers.onExport?.();
        return;
      }

      // Cmd/Ctrl + / - Focus input (if not already focused)
      if (modifier && event.key === "/") {
        event.preventDefault();
        handlers.onFocusInput?.();
        return;
      }

      // Escape - Clear focus from input
      if (event.key === "Escape" && isInputFocused) {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlers]);
}

/**
 * Get the keyboard shortcut display string for the current platform
 */
export function getShortcutKey(key: string): string {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifier = isMac ? "⌘" : "Ctrl";

  switch (key) {
    case "new":
      return `${modifier}+N`;
    case "search":
      return `${modifier}+K`;
    case "export":
      return `${modifier}+E`;
    case "focus":
      return `${modifier}+/`;
    default:
      return "";
  }
}
