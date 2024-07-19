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

	console.log(pathname.split("/").filter(Boolean));

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
					.map((path, idx, paths) => (
						<>
							<BreadcrumbItem key={path}>
								<BreadcrumbLink href={`/${paths.slice(0, idx + 1).join("/")}`}>
									{path.charAt(0).toUpperCase() + path.slice(1)}
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator hidden={idx === paths.length - 1} />
						</>
					))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

export default AutoBreadCrumbs;
