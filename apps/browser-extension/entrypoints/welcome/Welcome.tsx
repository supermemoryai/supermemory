function Welcome() {
	return (
		<div className="welcome-container">
			<div className="welcome-content">
				{/* Header */}
				<div className="welcome-header">
					<img
						src="/logo-trademark.svg"
						alt="supermemory"
						className="welcome-logo"
					/>
					<p className="welcome-subtitle">
						Your AI-powered second brain for saving and organizing everything
						that matters
					</p>
				</div>

				{/* Features Section */}
				<div className="welcome-features">
					<h2 className="features-title">What can you do with supermemory?</h2>

					<div className="features-grid">
						<div className="feature-card">
							<div className="feature-icon">💾</div>
							<h3>Save Any Page</h3>
							<p>
								Instantly save web pages, articles, and content to your personal
								knowledge base
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">🐦</div>
							<h3>Import Twitter/X Bookmarks</h3>
							<p>
								Bring all your saved tweets and bookmarks into one organized
								place
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">🤖</div>
							<h3>Import ChatGPT Memories</h3>
							<p>
								Keep your important AI conversations and insights accessible
							</p>
						</div>

						<div className="feature-card">
							<div className="feature-icon">🔍</div>
							<h3>AI-Powered Search</h3>
							<p>
								Find anything you've saved using intelligent semantic search
							</p>
						</div>
					</div>
				</div>

				{/* Getting Started */}
				<div className="welcome-getting-started">
					<h2 className="getting-started-title">
						Get Started in 2 Simple Steps
					</h2>

					<div className="steps">
						<div className="step">
							<div className="step-number">1</div>
							<div className="step-content">
								<h3>Login to Your Account</h3>
								<p>Connect your supermemory account to start saving content</p>
							</div>
						</div>

						<div className="step">
							<div className="step-number">2</div>
							<div className="step-content">
								<h3>Start Saving</h3>
								<p>Click the extension icon on any page to save it instantly</p>
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="welcome-actions">
					<button
						type="button"
						className="login-primary-btn"
						onClick={() => {
							chrome.tabs.create({
								url: import.meta.env.PROD
									? "https://app.supermemory.ai/login"
									: "http://localhost:3000/login",
							});
						}}
					>
						Login to Get Started
					</button>

					<div className="welcome-help">
						<p className="help-text">
							Need help getting started?{" "}
							<button
								type="button"
								className="help-link"
								onClick={() => {
									window.open("mailto:dhravya@supermemory.com", "_blank");
								}}
							>
								Contact Support
							</button>
						</p>
					</div>
				</div>

				{/* Footer */}
				<div className="welcome-footer">
					<p>
						Learn more at{" "}
						<a
							href="https://supermemory.ai"
							target="_blank"
							rel="noopener noreferrer"
							className="footer-link"
						>
							supermemory.ai
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}

export default Welcome;
