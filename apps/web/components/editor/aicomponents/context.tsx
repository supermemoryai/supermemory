import React, { createContext, useState, useContext } from "react";

type StateG = "Ask AI" | "Select Commands" | "Generating";

interface AppContextType {
  tab: number | undefined;
  setTab: React.Dispatch<React.SetStateAction<number | undefined>>;
  aiOpen: boolean;
  setAiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stateG: StateG;
  setStateG: React.Dispatch<React.SetStateAction<StateG>>;
  response: string;
  setResponse: React.Dispatch<React.SetStateAction<string>>;
  input: string[];
  setInput: React.Dispatch<React.SetStateAction<string[]>>;
}

const AiContext = createContext<AppContextType | undefined>(undefined);

export const AiContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tab, setTab] = useState<number | undefined>();
  const [aiOpen, setAiOpen] = useState<boolean>(false);
  const [stateG, setStateG] = useState<StateG>("Ask AI");
  const [input, setInput] = useState<string[]>(["", "", "", ""]);
  const [response, setResponse] = useState<string>("");

  return (
    <AiContext.Provider
      value={{ tab, setTab, aiOpen, setAiOpen, stateG, setStateG, response,setResponse, input, setInput
      }}
    >
      {children}
    </AiContext.Provider>
  );
};

export const useAiContext = () => {
  const context = useContext(AiContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
