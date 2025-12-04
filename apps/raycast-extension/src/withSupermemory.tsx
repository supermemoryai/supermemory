import { usePromise } from "@raycast/utils";
import { fetchSettings } from "./api";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { ComponentType } from "react";

export function withSupermemory<P extends object>(Component: ComponentType<P>) {
  return function SupermemoryWrappedComponent(props: P) {
    const { isLoading, data } = usePromise(fetchSettings, [], {
      failureToastOptions: {
        title: "Invalid API Key",
        message:
          "Invalid API key. Please check your API key in preferences. Get a new one from https://supermemory.link/raycast",
      },
    });

    if (!data) {
      return isLoading ? (
        <Detail isLoading />
      ) : (
        <List>
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="API Key Required"
            description="Please configure your Supermemory API key to search memories"
            actions={
              <ActionPanel>
                <Action
                  title="Open Extension Preferences"
                  onAction={openExtensionPreferences}
                  icon={Icon.Gear}
                />
              </ActionPanel>
            }
          />
        </List>
      );
    }

    return <Component {...props} />;
  };
}
