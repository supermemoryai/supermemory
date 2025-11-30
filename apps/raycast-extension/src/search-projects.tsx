import {
  ActionPanel,
  List,
  Action,
  Icon,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { fetchProjects, addProject } from "./api";
import {
  FormValidation,
  showFailureToast,
  useCachedPromise,
  useForm,
} from "@raycast/utils";
import { withSupermemory } from "./withSupermemory";

export default withSupermemory(Command);

function Command() {
  const { isLoading, data: projects, mutate } = useCachedPromise(fetchProjects);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your projects">
      {!isLoading && !projects?.length ? (
        <List.EmptyView
          title="No Projects Found"
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Create Project"
                target={<CreateProject />}
                onPop={mutate}
              />
            </ActionPanel>
          }
        />
      ) : (
        projects?.map((project) => (
          <List.Item
            key={project.id}
            icon={Icon.Folder}
            title={project.name}
            subtitle={project.description}
            accessories={[{ tag: project.containerTag }]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.Plus}
                  title="Create Project"
                  target={<CreateProject />}
                  onPop={mutate}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function CreateProject() {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { handleSubmit, itemProps } = useForm<{ name: string }>({
    async onSubmit(values) {
      setIsLoading(true);
      try {
        await addProject(values);
        pop();
      } catch (error) {
        await showFailureToast(error, { title: "Failed to add project" });
      } finally {
        setIsLoading(false);
      }
    },
    validation: {
      name: FormValidation.Required,
    },
  });
  return (
    <Form
      navigationTitle="Search Projects / Add"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            icon={Icon.Plus}
            title="Create Project"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Name"
        placeholder="My Awesome Project"
        info="This will help you organize your memories"
        {...itemProps.name}
      />
    </Form>
  );
}
