import { Cog6ToothIcon } from "@heroicons/react/16/solid";

function Footer() {
	return (
		<div className=" flex items-center justify-between">
			{/* <Link href={'/'} className="text-branding flex items-center gap-2.5">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M1.61539 0C0.723233 0 0 0.723233 0 1.61539V12.3846C0 13.2768 0.723233 14 1.61539 14H12.3846C13.2768 14 14 13.2768 14 12.3846V1.61539C14 0.723233 13.2768 0 12.3846 0H1.61539ZM6.46153 7.5384C5.86676 7.5384 5.3846 8.0206 5.3846 8.61533V11.3077C5.3846 11.9024 5.86676 12.3845 6.46153 12.3845H11.3077C11.9025 12.3845 12.3846 11.9024 12.3846 11.3077V8.61533C12.3846 8.02053 11.9025 7.5384 11.3077 7.5384H6.46153Z" fill="#A3A4A5" />
                </svg>
                <p className="pt-0.5">Powered by Computir</p>
            </Link> */}

			<button className="text-icon flex items-center gap-2">
				<Cog6ToothIcon className="size-4" />
				Settings
			</button>
		</div>
	);
}

export default Footer;
