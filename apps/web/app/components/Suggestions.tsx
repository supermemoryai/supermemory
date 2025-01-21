import React from "react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { CircleHelp } from "lucide-react";

interface SuggestionProps {
  text: string;
  onClick: () => void;
}

const SingleSuggestion: React.FC<SuggestionProps> = ({ text, onClick }) => {
	return (
		<Button
			variant="secondary"
			className="text-muted-foreground w-full md:w-auto text-xs md:text-sm text-left h-auto whitespace-normal"
			onClick={onClick}
		>
			<CircleHelp className="w-4 h-4 mr-2 flex-shrink-0" />
			<span className="line-clamp-2">{text}</span>
		</Button>
	);
};

interface SuggestionsProps {
  items: string[];
  onSelect: (item: string) => void;
}

const Suggestions: React.FC<SuggestionsProps> = ({ items, onSelect }) => {
  return (
    <div className={cn("grid grid-cols-1 md:flex md:flex-wrap gap-2 mt-4")}>
      {items?.map((item, index) => (
        <SingleSuggestion
          key={index}
          text={item}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  );
};

export default Suggestions;
