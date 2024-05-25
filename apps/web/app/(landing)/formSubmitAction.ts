"use server";
import { headers } from "next/headers";

const formSubmitAction = async (email: string, token: string) => {
  console.log("email submitted:", email);
  const formBody = `email=${encodeURIComponent(email)}`;
  const h = await headers();
  const ip = h.get("cf-connecting-ip");

  if (ip) {
    if (process.env.RATELIMITER) {
      // @ts-ignore
      const { success } = await process.env.RATELIMITER.limit({
        key: `waitlist-${ip}`,
      });

      if (!success) {
        console.error("rate limit exceeded");
        return { value: "Rate limit exceeded", success: false };
      }
    } else {
      console.info("RATELIMITER not found in env");
    }
  } else {
    console.info("cf-connecting-ip not found in headers");
  }

  const resp = await fetch(
    "https://app.loops.so/api/newsletter-form/clwcn8dde0059m6hobbdw2rwe",
    {
      method: "POST",
      body: formBody,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );

  if (resp.ok) {
    console.log("email submitted successfully");
    return { value: await resp.json(), success: true };
  } else {
    console.error("email submission failed");
    return { value: await resp.text(), success: false };
  }
};

export default formSubmitAction;
