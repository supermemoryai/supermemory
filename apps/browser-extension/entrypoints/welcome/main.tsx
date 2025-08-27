import React from "react";
import ReactDOM from "react-dom/client";
import Welcome from "./Welcome";
import "./welcome.css";

const rootElement = document.getElementById("root");
if (rootElement) {
	ReactDOM.createRoot(rootElement).render(
		<React.StrictMode>
			<Welcome />
		</React.StrictMode>,
	);
}
