"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";

interface Option {
  value: string;
  label: string;
}

interface ComboboxWithCreateProps {
  options: Option[];
  onSelect: (value: string) => void;
  onSubmit: (newName: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  createNewMessage?: string;
  className?: string;
}

const ComboboxWithCreate: React.FC<ComboboxWithCreateProps> = ({
  options: initialOptions,
  onSelect,
  onSubmit,
  placeholder = "Select an option",
  emptyMessage = "No option found.",
  createNewMessage = "Create",
  className,
}) => {
  const [options, setOptions] = useState<Option[]>(initialOptions);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  return (
    <Command className={cn("group", className)}>
      <CommandInput
        onChangeCapture={(e) => setInputValue(e.currentTarget.value)}
        placeholder={placeholder}
        value={inputValue}
      />
      <CommandList className="z-10 translate-y-12 translate-x-5 opacity-0 absolute group-focus-within:opacity-100 bg-secondary p-2 rounded-b-xl max-w-64">
        <CommandEmpty>
          <Button onClick={async () => onSubmit(inputValue)} variant="link">
            {createNewMessage} "{inputValue}"
          </Button>
          <p>Start by creating a space and adding content to it</p>
        </CommandEmpty>
        <CommandGroup className="hidden group-focus-within:block">
          {options.map((option, idx) => (
            <CommandItem
              key={`opt-${idx}`}
              onSelect={() => onSelect(option.value)}
            >
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};

export default ComboboxWithCreate;
