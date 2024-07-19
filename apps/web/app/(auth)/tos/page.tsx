import React from "react";
import Markdown from "react-markdown";

function Page() {
	return (
		<div className="flex flex-col items-center justify-center mt-8">
			<div className="max-w-3xl prose prose-invert">
				<Markdown>
					{`
            Terms of Service for Supermemory.ai

**Effective Date:** July 4, 2024

Welcome to Supermemory! By using our app, you agree to the following terms and conditions. Please read them carefully.

### 1. Acceptance of Terms
By accessing or using the Supermemory app, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree with any part of these terms, you must not use the app.

### 2. Description of Service
Supermemory allows users to save information from various sources on the internet, organize it, and interact with it using AI. The service includes features such as:
- **Knowledge Canvas:** Arrange your saved information in a 2D canvas.
- **Writing Assistant:** Use our markdown editor to create content with AI assistance.
- **Data Collection:** Collect data from any website and bring it into your second brain.
- **Powerful Search:** Quickly find any saved information.

### 3. User Responsibilities
- **Account Security:** You are responsible for maintaining the confidentiality of your account and password.
- **Content:** You must ensure that any content you save or upload does not violate any laws or third-party rights.
- **Usage:** You agree not to misuse the app, including but not limited to, attempting to gain unauthorized access to the service or its related systems.

### 4. Intellectual Property
All content, trademarks, and data on the Supermemory app are the property of Supermemory or its licensors. You may not use any of this content without permission.

### 5. Privacy
Your use of the app is also governed by our Privacy Policy, which explains how we collect, use, and protect your information.

### 6. Termination
We reserve the right to suspend or terminate your access to the app at our discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users.

### 7. Limitation of Liability
Supermemory is provided "as is" without any warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free. To the fullest extent permitted by law, Supermemory will not be liable for any damages arising from the use of the app.

### 8. Changes to Terms
We may update these Terms of Service from time to time. We will notify you of any changes by posting the new terms on our app. Your continued use of the app after such changes constitutes your acceptance of the new terms.

### 9. Contact Information
If you have any questions about these Terms of Service, please contact us at dhravyashah@gmail.com.

**By using Supermemory, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.**
`}
				</Markdown>
			</div>
		</div>
	);
}

export default Page;
