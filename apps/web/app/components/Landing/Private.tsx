import { Eye, Lock, ShieldCheck } from "lucide-react";

export default function Private() {
	const privacyFeatures = [
		{ icon: ShieldCheck, text: "End-to-end encryption" },
		{ icon: Lock, text: "Self-hosted option available" },
		{ icon: Eye, text: "Zero knowledge architecture" },
	];

	return (
		<div className="min-h-full my-7 flex items-center justify-center p-4">
			<div className="max-w-[1000px] px-2 md:px-10 w-full bg-[#F5F7FF] rounded-3xl p-16 shadow-[0_2px_40px_rgba(0,0,0,0.05)]">
				<div className="space-y-6 text-center">
					<h1 className="text-[40px] leading-[1.2] font-medium tracking-[-0.02em] text-[#111111]">
						Your knowledge stays
						<br />
						private and secure
					</h1>

					<p className="text-[#666666] text-lg leading-relaxed max-w-[600px] mx-auto">
						We take privacy seriously. Your data is fully encrypted, never shared with third
						parties. Even on the hosted version, we securely store your data in our own servers.
					</p>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 max-w-[700px] mx-auto">
						{privacyFeatures.map((feature, index) => (
							<div key={index} className="flex flex-col items-center gap-3">
								<div className="w-12 h-12 rounded-xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] flex items-center justify-center">
									<feature.icon className="w-6 h-6 text-[#3B82F6]" />
								</div>
								<span className="text-sm text-gray-700 font-medium">{feature.text}</span>
							</div>
						))}
					</div>

					<div className="pt-10 flex flex-wrap justify-center gap-4">
						<a
							href="https://docs.supermemory.ai/self-hosting"
							className="inline-flex items-center gap-2 bg-[#1E3A8A] text-white py-3 px-6 rounded-lg hover:bg-opacity-90 transition-all duration-200 hover:translate-y-[-1px]"
						>
							Self-host Supermemory
						</a>

						<a
							href="https://docs.supermemory.ai/essentials/architecture"
							className="inline-flex items-center gap-2 bg-white text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:translate-y-[-1px]"
						>
							Our architecture
						</a>

						<a
							href="https://git.new/memory"
							className="inline-flex items-center gap-2 bg-white text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:translate-y-[-1px]"
						>
							Check out the code
						</a>
					</div>
				</div>
			</div>
		</div>
	);
}
