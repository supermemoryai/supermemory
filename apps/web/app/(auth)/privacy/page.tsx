import React from "react";
import Markdown from "react-markdown";

function Page() {
	return (
		<div className="flex flex-col items-center justify-center mt-8">
			<div className="max-w-3xl prose prose-invert">
				<Markdown>
					{`
            Privacy Policy for Supermemory.ai
# Introduction
This Privacy Policy provides detailed information on the handling, storage, and protection of your personal information by Supermemory.ai - A web app and a browser extension developed and owned by Dhravya Shah and Supermemory team in 2024. The extension is designed to enhance your browsing experience by providing contextual information based on the content of the web pages you visit. This policy outlines the types of data collected by Supermemory.ai, how it is used, and the measures we take to protect your privacy.


Information Collection
Supermemory.ai collects the following types of information:

### In the web app
- **Personal Information**:
When you interact with Supermemory.ai, we may collect personal information including but not limited to your email address, session data, name, and profile picture. This information is collected to improve your user experience and to provide personalized services.

- **Usage Data**:
Supermemory.ai stores data related to your usage of the web app, including but not limited to the pages you visit, the features you use, and the time spent on the app. This data is used to improve the functionality of the app and to provide you with a better user experience.

- **Saved content**: 
When you use the save feature, Supermemory.ai stores the content you save. This information is used to provide you with quick access to your saved content. This information is also stored in a vector database so that you can easily search for your saved content.

- **Chat and Query Data**:
When you use the chat feature or submit queries through the web app, we collect the data you provide. This information is used to provide a rich user experience with history of your past conversations.

### In the extension
- **Web Browsing Data**: 
The extension has the capability to see all websites that users visit. However, Supermemory.ai only stores data when the user actively clicks on the extension button while browsing. The browser history is not recorded, ensuring that your browsing activities remain private.

- **Current page data**: Upon activation (click) by the user, Supermemory.ai stores data from the current HTML page. This data is used to provide relevant contextual information based on the content of the page you are viewing.

## Data Storage and Security
All collected data is securely stored in a SQLite database hosted on [Cloudflare D1](https://developers.cloudflare.com/d1/), [Cloudflare vectorize](https://developers.cloudflare.com/vectorize/), and [Cloudflare KV](https://developers.cloudflare.com/kv). 
We employ industry-standard security measures to protect your information from unauthorized access, alteration, disclosure, or destruction. Despite our efforts, no method of transmission over the Internet or method of electronic storage is 100% secure. Therefore, while we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.

When you chat with the app, your queries may be sent to OpenAI GPT-4 API, Google Gemini API or other third-party services to provide you with relevant information. These services may store your queries and responses for training purposes. 

## Use of Information
Supermemory.ai uses the collected information for the following purposes:

To provide and improve the functionality of the web app and the extension.
To offer personalized user experiences.
To communicate with users regarding updates, support, and promotional offers, if consented.
To ensure the security of our services and to detect, prevent, or address technical issues.
Sharing of Information
Supermemory.ai does not sell, trade, or rent users' personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates, and advertisers for the purposes outlined above.

# Your Privacy Rights
You have the right to access, update, or delete your personal information that we hold. If you wish to exercise these rights, please contact us at the details provided below.

## Changes to This Privacy Policy
Supermemory.ai reserves the right to update this privacy policy at any time. When we do, we will post a notification on our website and update the date at the top of this page. We encourage users to frequently check this page for any changes to stay informed about how we are protecting the personal information we collect. Your continued use of the service after the posting of changes to this policy will be deemed your acceptance of those changes.

# Contact Us
If you have any questions about this Privacy Policy, the practices of this site, or your dealings with this site, please contact us at:

Email: dhravyashah@gmail.com
This document was last updated on July 4, 2024.

`}
				</Markdown>
			</div>
		</div>
	);
}

export default Page;
