import { AskIcon, AutocompleteIcon, GrammarIcon, RewriteIcon } from "./_svg/svg";
import { Global, Bookmark, Formal, Rewrite, Grammar, Expand, Reduce, Light, Accept} from "./svg";


export const AIOptions = [
  {
    placeholder: "Ask a question, select text for context",
    beforeComplete: [
      {
        name: "Expain",
        icon: <Light />,
      },
    ],
    afterComplete: [
      {
        name: "Accept Response",
        icon: <Accept />
      },
      {
        name: "Regenerate",
        icon: <Rewrite />,
      }
    ],
  },
  {
    placeholder: "select the content to modify or it uses the current node. Type here to be more specific !",
    beforeComplete: [
      {
        name: "rewrite",
        icon: <Rewrite />,
      },
      {
        name: "fix grammar",
        icon: <Grammar />,
      },
      {
        name: "be formal",
        icon: <Formal />,
      },
    ],
    afterComplete: [
      {
        name: "Accept Response",
        icon: <Accept />
      },
      {
        name: "Regenerate",
        icon: <Rewrite />,
      }
    ],
  },
  {
    placeholder: "wanna be more specific? type here.",
    beforeComplete: [
      {
        name: "Expand",
        icon: <Expand />,
      },
      {
        name: "Reduce",
        icon: <Reduce />,
      },
    ],
    afterComplete: [
      {
        name: "Accept Response",
        icon: <Accept />
      },
      {
        name: "Regenerate",
        icon: <Rewrite />,
      }
    ],
  },
  {
    placeholder: "any specific section do you want to continue about?",
    beforeComplete: [
      {
        name: "Use internet",
        icon: <Global />,
      },
      {
        name: "Use memories",
        icon: <Bookmark />,
      },
    ],
    afterComplete: [
      {
        name: "Accept Response",
        icon: <Accept />
      },
      {
        name: "Regenerate",
        icon: <Rewrite />,
      }
    ],
  },
];

export const tabs = [
  {
    name: "Ask AI",
    shortcut: "⌘1",
    icon: AskIcon,
  },
  {
    name: "Improve",
    shortcut: "⌘2",
    icon: RewriteIcon,

  },
  {
    name: "Change Length",
    shortcut: "⌘3",
    icon: GrammarIcon,
  },
  {
    name: "AutoComplete",
    shortcut: "⌘4",
    icon: AutocompleteIcon,
  },
];