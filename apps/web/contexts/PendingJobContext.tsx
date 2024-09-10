"use client";
import React, { createContext, useState, useContext } from "react";

interface PendingJobContextType {
	pendingJobs: number;
	setPendingJobs: (pendingJobs: number) => void;
}

const PendingJobContext = createContext<PendingJobContextType | undefined>(
	undefined,
);

export const PendingJobProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [pendingJobs, setPendingJobs] = useState(0);

	return (
		<PendingJobContext.Provider value={{ pendingJobs, setPendingJobs }}>
			{children}
		</PendingJobContext.Provider>
	);
};

export const usePendingJob = () => {
	const context = useContext(PendingJobContext);
	if (context === undefined) {
		throw new Error("usePendingJob must be used within a PendingJobProvider");
	}
	return context;
};
