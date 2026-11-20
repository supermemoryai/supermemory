# Privacy Policy

This plugin connects Dify to the Supermemory API. It runs inside the Dify plugin runtime and has no backend of its own.

## Data the plugin sends

The plugin sends data to one external service, the Supermemory API at `https://api.supermemory.ai`. It sends data only when Dify validates the credential or when one of the tools runs.

| Action | Data sent to Supermemory |
| --- | --- |
| Credential validation | A request to list one namespace, used to check the API key |
| Add Memory | Namespace, content, optional document ID, optional metadata, processing mode |
| Search Memories | Namespace, query, limit, search mode, threshold |
| Get Profile | Namespace |
| Forget Memories | Namespace, memory IDs |

Every request carries your Supermemory API key in the `Authorization` header, plus the SDK name, SDK version, Python version and operating system name that the official `supermemory` Python SDK adds to its request headers.

The content, queries, metadata and namespaces are whatever your Dify app passes to the tools. They can contain personal data such as names, user IDs or conversation text. You decide what is sent.

## Data the plugin collects, stores and logs

The plugin does not collect, store, cache or log user data. It has no analytics and no telemetry of its own. Tool inputs are passed to Supermemory and the responses are returned to Dify.

The API key is saved by Dify as a secret credential. The plugin reads it only to authenticate requests to `api.supermemory.ai`.

## Third-party services

Supermemory stores the content you add and the memories and profile it derives from that content, so that later searches can return them. How Supermemory handles this data is described in the [Supermemory privacy policy](https://supermemory.ai/privacy/).

The plugin does not share data with any other third party.

## Deleting data

Use the Forget Memories tool to remove specific memories from recall. To delete stored documents or a whole namespace, use the Supermemory API. See the [Supermemory docs](https://supermemory.ai/docs).

## Contact

Questions about this plugin: support@supermemory.com
