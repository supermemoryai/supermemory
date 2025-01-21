import React, { createContext, useCallback, useContext, useEffect } from "react";

// Define types
type ModifierKey = "command" | "ctrl" | "shift" | "alt" | "meta";
type Key = ModifierKey | string;

type Shortcut = {
	keys: Key[];
	callback: () => void;
	label?: string;
};

type KeyboardContextType = {
	registerShortcut: (shortcut: Shortcut) => void;
	unregisterShortcut: (keys: Key[]) => void;
};

// Create context
const KeyboardContext = createContext<KeyboardContextType | null>(null);

// Create provider component
export function KeyboardProvider({ children }: { children: React.ReactNode }) {
	const shortcuts = new Map<string, Shortcut>();

	const registerShortcut = useCallback((shortcut: Shortcut) => {
		const key = shortcut.keys.sort().join("+");
		shortcuts.set(key, shortcut);
	}, []);

	const unregisterShortcut = useCallback((keys: Key[]) => {
		const key = keys.sort().join("+");
		shortcuts.delete(key);
	}, []);

	const handleKeyDown = useCallback((event: KeyboardEvent) => {
		// Don't trigger shortcuts when typing in input elements
		if (
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement ||
			(event.target as HTMLElement).isContentEditable
		) {
			return;
		}

		const pressedKeys: Key[] = [];

		// Handle modifier keys
		if (event.metaKey) {
			pressedKeys.push("command"); // Always use "command" for metaKey
		} else if (event.ctrlKey) {
			pressedKeys.push("ctrl");
		}
		if (event.shiftKey) pressedKeys.push("shift");
		if (event.altKey) pressedKeys.push("alt");

		// Add the actual key if it's not a modifier
		if (
			!["Meta", "Control", "Shift", "Alt"].includes(event.key) &&
			event.key.length === 1
		) {
			pressedKeys.push(event.key.toLowerCase());
		} else if (event.key.length > 1) {
			// Handle special keys like Enter, Escape, etc
			pressedKeys.push(event.key.toLowerCase());
		}

		const key = pressedKeys.sort().join("+");
		const shortcut = shortcuts.get(key);

		if (shortcut) {
			event.preventDefault();
			shortcut.callback();
		}
	}, []);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return (
		<KeyboardContext.Provider value={{ registerShortcut, unregisterShortcut }}>
			{children}
		</KeyboardContext.Provider>
	);
}

export function useKeyboardShortcut(keys: Key[], callback: () => void, label?: string) {
	const context = useContext(KeyboardContext);

	if (!context) {
		throw new Error("useKeyboardShortcut must be used within a KeyboardProvider");
	}

	useEffect(() => {
		const shortcut = { keys, callback, label };
		context.registerShortcut(shortcut);
		return () => context.unregisterShortcut(keys);
	}, [keys.join(","), callback, label, context]);
}