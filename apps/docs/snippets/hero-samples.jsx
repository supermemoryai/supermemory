export const HERO_TS = `import { Supermemory } from "supermemory";

const client = new Supermemory();

// March
await client.add("user_4f8a", {
  content: "I work at Google on the Maps team.",
});

// June
await client.add("user_4f8a", {
  content: "Big news: I just started at Stripe!",
});

// Later: what does your agent know about this user?
const { profile } = await client.profile("user_4f8a");

console.log(profile.static.map((m) => m.memory));
// \u2192 ["Now works at Stripe."]`

export const HERO_PY = `from supermemory import Supermemory

client = Supermemory()

# March
client.add("user_4f8a", content="I work at Google on the Maps team.")

# June
client.add("user_4f8a", content="Big news: I just started at Stripe!")

# Later: what does your agent know about this user?
profile = client.profile("user_4f8a").profile

print([m.memory for m in profile.static])
# \u2192 ["Now works at Stripe."]`

export const HERO_CURL = `# March
curl https://api.supermemory.ai/ns/user_4f8a/document \\
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "I work at Google on the Maps team."}'

# June
curl https://api.supermemory.ai/ns/user_4f8a/document \\
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Big news: I just started at Stripe!"}'

# Later: what does your agent know about this user?
curl -X POST https://api.supermemory.ai/ns/user_4f8a/profile \\
  -H "Authorization: Bearer $SUPERMEMORY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{}'
# \u2192 {"profile": {"static": [{"id": "mem_1", "memory": "Now works at Stripe."}], "dynamic": []}}`
