import { StrictMode, startTransition, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";

import { RemixBrowser } from "@remix-run/react";

startTransition(() => {
	hydrateRoot(
		document,
		// <StrictMode>
		<>
			<RemixBrowser />
		</>,
		// </StrictMode>,
	);
});
