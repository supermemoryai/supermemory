import { html } from "hono/html";

export function LandingPage() {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="/output.css" rel="stylesheet" />
        <title>Supermemory API</title>
      </head>
      <body>
        <div className="gradient-dark">
          <header className="bg-gray-900/50 dot-pattern">
            <nav className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">
                  Supermemory API
                </div>
                <div className="hidden md:flex space-x-8">
                  <a
                    href="#features"
                    className="text-gray-300 hover:text-white"
                  >
                    Features
                  </a>
                  <a
                    href="https://docs.supermemory.ai/"
                    target="_blank"
                    className="text-gray-300 hover:text-white"
                    rel="noreferrer"
                  >
                    Documentation
                  </a>
                </div>
                <a
                  href="https://docs.supermemory.ai/"
                  target="_blank"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  rel="noreferrer"
                >
                  Get Started
                </a>
              </div>
            </nav>

            <div className="container mx-auto px-6 py-16 text-center">
              <h1 className="text-4xl font-bold text-white mb-4">
                The Modern API for Knowledge Management
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Build powerful search and AI applications with our flexible,
                production-ready API
              </p>
              <div className="flex justify-center space-x-4">
                <a
                  href="https://docs.supermemory.ai/"
                  target="_blank"
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700"
                  rel="noreferrer"
                >
                  Get Started Free
                </a>
                <a
                  href="https://docs.supermemory.ai/"
                  target="_blank"
                  className="border border-gray-600 text-gray-300 px-8 py-3 rounded-lg hover:bg-gray-700"
                  rel="noreferrer"
                >
                  View Docs
                </a>
              </div>
            </div>
          </header>

          <section id="features" className="py-20 bg-gray-900/50 dot-pattern">
            <div className="container mx-auto px-6">
              <h2 className="text-3xl font-bold text-center text-white mb-12">
                Key Features
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-6 border border-gray-600 rounded-lg bg-gray-900 hover:bg-gray-800 transition duration-300">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Battle-Tested RAG Stack
                  </h3>
                  <p className="text-gray-300">
                    Production-ready retrieval augmented generation architecture
                    for reliable and scalable information retrieval.
                  </p>
                </div>
                <div className="p-6 border border-gray-600 rounded-lg bg-gray-900 hover:bg-gray-800 transition duration-300">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Flexible LLM Integration
                  </h3>
                  <p className="text-gray-300">
                    Use any LLM of your choice or operate in search-only mode
                    for maximum flexibility and control.
                  </p>
                </div>
                <div className="p-6 border border-gray-600 rounded-lg bg-gray-900 hover:bg-gray-800 transition duration-300">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Advanced Access Control
                  </h3>
                  <p className="text-gray-300">
                    Comprehensive collection filtering and permission management
                    for secure data access.
                  </p>
                </div>
                <div className="p-6 border border-gray-600 rounded-lg bg-gray-900 hover:bg-gray-800 transition duration-300">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Seamless Data Import
                  </h3>
                  <p className="text-gray-300">
                    Magic link import and platform synchronization for
                    effortless data integration.
                  </p>
                </div>
                <div className="p-6 border border-gray-600 rounded-lg bg-gray-900 hover:bg-gray-800 transition duration-300">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Real-time Monitoring
                  </h3>
                  <p className="text-gray-300">
                    Track and analyze memory usage patterns in real-time with
                    detailed metrics.
                  </p>
                </div>
                <div className="p-6 border border-gray-600 rounded-lg bg-gray-900 hover:bg-gray-800 transition duration-300">
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    Easy Integration
                  </h3>
                  <p className="text-gray-300">
                    Simple API endpoints that integrate seamlessly with your
                    existing infrastructure.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <footer className="bg-black/50 dot-pattern">
            <div className="container mx-auto px-6">
              <div className="grid md:grid-cols-4 gap-8">
                <div>
                  <h4 className="text-lg font-semibold mb-4">
                    Supermemory API
                  </h4>
                  <p className="text-gray-400">
                    Making memory management simple and efficient for developers
                    worldwide.
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Product</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <a href="#features" className="hover:text-white">
                        Features
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://docs.supermemory.ai/"
                        target="_blank"
                        className="hover:text-white"
                        rel="noreferrer"
                      >
                        Documentation
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Connect</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <a
                        href="https://x.com/supermemoryai"
                        target="_blank"
                        className="hover:text-white"
                        rel="noreferrer"
                      >
                        X (formerly Twitter)
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://github.com/supermemoryai"
                        target="_blank"
                        className="hover:text-white"
                        rel="noreferrer"
                      >
                        GitHub
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://discord.gg/b3BgKWpbtR"
                        target="_blank"
                        className="hover:text-white"
                        rel="noreferrer"
                      >
                        Discord
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2024 Supermemory API. All rights reserved.</p>
              </div>
            </div>
          </footer>

          <style
            dangerouslySetInnerHTML={{
              __html: `
				.dot-pattern {
					background-image: radial-gradient(
						rgba(255, 255, 255, 0.1) 1px,
						transparent 1px
					);
					background-size: 24px 24px;
				}
				.gradient-dark {
					background: linear-gradient(to bottom right, rgb(17 24 39), rgb(0 0 0));
				}
			`,
            }}
          />
        </div>
      </body>
    </html>
  );
}
