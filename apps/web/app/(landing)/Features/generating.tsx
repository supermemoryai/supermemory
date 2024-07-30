import { Loader, Loader2 } from "lucide-react";

const Generating = ({ className }: { className?: string }) => {
	return (
		<div
			className={`flex items-center md:h-[3.5rem] px-6 bg-n-8/80 rounded-[1.7rem] ${
				className || ""
			} text-base`}
		>
			<Loader2 className="w-5 h-5 mr-2" />
			Searching your second brain...
		</div>
	);
};

export default Generating;
