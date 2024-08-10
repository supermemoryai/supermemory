import { Command } from "cmdk";
import CommandItem from "./Item";
import { ClockIcon, CloudIcon } from "@heroicons/react/16/solid";
import { GroupLabel } from "./GroupLabel";
import useCommandStore from "../../../store";
import { ArrowPathIcon, ClipboardIcon } from "@heroicons/react/24/outline";

function AiSearchView() {
	const pages = useCommandStore((state) => state.pages);
	const setPages = useCommandStore((state) => state.setPages);

	return (
		<div className="space-y-5">
			{/* section */}
			<div className="">
				<div className="flex justify-between">
					<GroupLabel>Model: Claude 3.5</GroupLabel>
					<GroupLabel>response time: 2.1s</GroupLabel>
				</div>

				{/* response */}
				<div className="space-y-5 px-2">
					{/* text response */}
					<div>
						<p>{`Based on the current financial data and market trends, the projected revenue for this quarter is estimated to be around $11.2 million. This represents a 12% increase compared to the previous quarter, driven by strong demand for our new product line and expanded customer base. However, it's important to note that these are projections and the actual revenue may vary depending on various market conditions and unforeseen circumstances.`}</p>
					</div>

					{/* response actions */}
					<div className="space-x-4">
						<button className="text-icon hover:text-white duration-200">
							<ClipboardIcon className="size-4" />
						</button>

						<button className="text-icon hover:text-white duration-200">
							<ArrowPathIcon className="size-4" />
						</button>
					</div>
				</div>
			</div>

			<div className="pt-5">
				{/* <div className='flex justify-between'> */}
				<GroupLabel>Chart visualisation</GroupLabel>
				{/* <GroupLabel>response time: 2.1s</GroupLabel> */}
				{/* </div> */}

				{/* response */}
				<div className="px-2 flex gap-6">
					{/* insights */}
					<div className="py-2 flex flex-col gap-4">
						<div className="flex justify-between gap-8">
							<p>Growth from previous quarter:</p>
							<p>+12%</p>
						</div>

						<div className="flex justify-between gap-8">
							<p>Month on month growth:</p>
							<p>+86.67%</p>
						</div>

						<div className="flex justify-between gap-8">
							<p>Growth from past year:</p>
							<p className="text-red-400">-25.23%</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AiSearchView;
