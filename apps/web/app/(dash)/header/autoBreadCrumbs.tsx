"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@repo/ui/shadcn/breadcrumb";
import { usePathname } from "next/navigation";
import React from "react";

function AutoBreadCrumbs() {
	const pathname = usePathname();

	return (
		<Breadcrumb className="hidden md:block">
			<BreadcrumbList>
				{!pathname.startsWith("/home") && (
					<>
						<BreadcrumbItem>
							<BreadcrumbLink href="/">Home</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator hidden={pathname.split("/").length === 1} />
					</>
				)}
				{pathname
					.split("/")
					.filter(Boolean)
					.map((path, idx, paths) => {
						const isSpacePath = path === "space";
						const href = isSpacePath
							? `/memories?tab=spaces`
							: `/${paths.slice(0, idx + 1).join("/")}`;

						return (
							<React.Fragment key={path + idx}>
								<BreadcrumbItem>
									<BreadcrumbLink href={href}>
										{path.charAt(0).toUpperCase() + path.slice(1)}
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator hidden={idx === paths.length - 1} />
							</React.Fragment>
						);
					})}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

export default AutoBreadCrumbs;
