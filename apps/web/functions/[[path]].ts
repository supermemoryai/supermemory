import * as build from "../build/server";
import server from "../server";

import handle from "hono-remix-adapter/cloudflare-pages";

export const onRequest = handle(build, server);
