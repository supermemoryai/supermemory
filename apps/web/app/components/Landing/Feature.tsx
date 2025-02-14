"use client";
export default function Feature2() {
	return (
		<div className="flex flex-col gap-2 justify-center items-center">
			<svg
				className="w-[40%] h-[40%] mx-auto"
				viewBox="0 0 604 283"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<linearGradient id="pulseGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="4%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="8%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="70%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="74%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="8%" stop-color="rgba(255,255,255,0)"></stop>
						<animate
							attributeName="y1"
							from="0%"
							to="100%"
							dur="2s"
							repeatCount="indefinite"
							begin="0s"
						></animate>
						<animate
							attributeName="y2"
							from="100%"
							to="200%"
							dur="2s"
							repeatCount="indefinite"
							begin="0s"
						></animate>
					</linearGradient>
					<linearGradient id="pulseGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="4%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="8%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="70%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="74%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="78%" stop-color="rgba(255,255,255,0)"></stop>
						<animate
							attributeName="y1"
							from="0%"
							to="100%"
							dur="2s"
							repeatCount="indefinite"
							begin="0.25s"
						></animate>
						<animate
							attributeName="y2"
							from="100%"
							to="200%"
							dur="2s"
							repeatCount="indefinite"
							begin="0.25s"
						></animate>
					</linearGradient>
					<linearGradient id="pulseGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="4%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="8%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="70%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="74%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="78%" stop-color="rgba(255,255,255,0)"></stop>
						<animate
							attributeName="y1"
							from="0%"
							to="100%"
							dur="2s"
							repeatCount="indefinite"
							begin="0.5s"
						></animate>
						<animate
							attributeName="y2"
							from="100%"
							to="200%"
							dur="2s"
							repeatCount="indefinite"
							begin="0.5s"
						></animate>
					</linearGradient>
					<linearGradient id="pulseGradient4" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="4%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="8%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="70%" stop-color="rgba(255,255,255,0)"></stop>
						<stop offset="74%" stop-color="rgba(255,255,255,0.5)"></stop>
						<stop offset="78%" stop-color="rgba(255,255,255,0)"></stop>
						<animate
							attributeName="y1"
							from="0%"
							to="100%"
							dur="2s"
							repeatCount="indefinite"
							begin="0.75s"
						></animate>
						<animate
							attributeName="y2"
							from="100%"
							to="200%"
							dur="2s"
							repeatCount="indefinite"
							begin="0.75s"
						></animate>
					</linearGradient>
					<linearGradient id="blueBase" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(48, 165, 255, 0)"></stop>
						<stop offset="100%" stop-color="#30A5FF"></stop>
					</linearGradient>
					<linearGradient id="yellowBase" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(255, 186, 23, 0)"></stop>
						<stop offset="100%" stop-color="#FFBA17"></stop>
					</linearGradient>
					<linearGradient id="redBase" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(255, 134, 111, 0)"></stop>
						<stop offset="100%" stop-color="#FF866F"></stop>
					</linearGradient>
					<linearGradient id="purpleBase" x1="0%" y1="0%" x2="0%" y2="100%">
						<stop offset="0%" stop-color="rgba(151, 0, 244, 0)"></stop>
						<stop offset="100%" stop-color="#9700F4"></stop>
					</linearGradient>
				</defs>
				<path d="M3 0C3 157 280 90 280 282" stroke="url(#blueBase)" stroke-width="3"></path>
				<path d="M200 0C200 157 294 90 294 282" stroke="url(#yellowBase)" stroke-width="3"></path>
				<path d="M400 0C400 157 307 90 307 282" stroke="url(#redBase)" stroke-width="3"></path>
				<path d="M601 0C601 157 320 90 320 282" stroke="url(#purpleBase)" stroke-width="3"></path>
				<path d="M3 0C3 157 280 90 280 282" stroke="url(#pulseGradient1)" stroke-width="3"></path>
				<path
					d="M200 0C200 157 294 90 294 282"
					stroke="url(#pulseGradient2)"
					stroke-width="3"
				></path>
				<path
					d="M400 0C400 157 307 90 307 282"
					stroke="url(#pulseGradient3)"
					stroke-width="3"
				></path>
				<path
					d="M601 0C601 157 320 90 320 282"
					stroke="url(#pulseGradient4)"
					stroke-width="3"
				></path>
			</svg>
			<div className="w-full mx-auto text-center">
				<h2 className="text-3xl md:text-4xl mb-1">Meet Supermemory.</h2>
				<h3 className="text-3xl md:text-4xl  mb-8">Your second brain for knowledge.</h3>
				<p className="text-gray-600 max-w-3xl mx-auto">
					Save the things you like, and over time, build the knowledge base of your dreams.
					<br />
					Go down rabbit holes, make connections, search what's important to you.
				</p>
			</div>
		</div>
	);
}
