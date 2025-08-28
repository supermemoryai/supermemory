function Welcome() {
	return (
		<div className="welcome-container">
			<div className="welcome-content">
				{/* Header */}
				<div className="welcome-header">
					<img
						alt="supermemory"
						className="welcome-logo"
						src="https://assets.supermemory.ai/brand/wordmark/dark-transparent.svg"
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

				{/* Actions */}
				<div className="welcome-actions">
					<button
						className="login-primary-btn"
						onClick={() => {
							chrome.tabs.create({
								url: import.meta.env.PROD
									? "https://app.supermemory.ai/login"
									: "http://localhost:3000/login",
							})
						}}
						type="button"
					>
						Login to Get started
					</button>
				</div>

				{/* Footer */}
				<div className="welcome-footer">
					<p>
						Learn more at{" "}
						<a
							className="footer-link"
							href="https://supermemory.ai"
							rel="noopener noreferrer"
							target="_blank"
						>
							supermemory.ai
						</a>
					</p>
				</div>
			</div>
		</div>
	)
}

export default Welcome
