import { fromHono } from "chanfana";
import { Hono } from "hono";
import { serve as serveHono } from "@hono/node-server";

const app = fromHono(new Hono());

app.get("/", (c) => {
  return c.json({ message: "Hello, world!" });
});

app.get("/entry/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ message: `Hello, ${id}!` });
});

serveHono(app, (info) => {
  console.log(info);
});
