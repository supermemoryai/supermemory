import ReactDOM from "react-dom/client";
import ContentApp from "./ContentApp";
import("./base.css");

setTimeout(initial, 1000);

const appendTailwindStyleData = (shadowRoot: ShadowRoot) => {
	const styleSheet = document.createElement("style");

	const path = chrome.runtime.getURL("../public/output.css");

	fetch(path)
		.then((response) => response.text())
		.then((css) => {
			styleSheet.textContent = css;
			shadowRoot.appendChild(styleSheet);
		});
};

function initial() {
	// Create a new div element to host the shadow root.
	// Styles for this div is in `content/content.css`
	const hostDiv = document.createElement("div");
	hostDiv.id = "supermemory-extension-host";
	document.body.appendChild(hostDiv);

	// Attach the shadow DOM to the hostDiv and set the mode to
	// 'open' for accessibility from JavaScript.
	// Ref https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow
	const shadowRoot = hostDiv.attachShadow({ mode: "open" });

	// Create a new div element that will be the root container for the React app
	const rootDiv = document.createElement("div");
	rootDiv.id = "supermemory-extension-root";
	shadowRoot.appendChild(rootDiv);

	appendTailwindStyleData(shadowRoot);

	const root = ReactDOM.createRoot(rootDiv);

	const jwt = chrome.storage.local.get("jwt").then((data) => {
		return data.jwt;
	}) as Promise<string | undefined>;

	jwt.then((token) =>
		root.render(<ContentApp shadowRoot={shadowRoot} token={token} />),
	);
}

window.addEventListener("message", (event) => {
	if (event.source !== window) {
		return;
	}
	const jwt = event.data.token;

	if (jwt) {
		if (
			!(
				window.location.hostname === "localhost" ||
				window.location.hostname === "supermemory.ai" ||
				window.location.hostname === "beta.supermemory.ai"
			)
		) {
			console.log(
				"JWT is only allowed to be used on localhost or supermemory.ai",
			);
			return;
		}

		chrome.storage.local.set({ jwt }, () => {});
	}
});
