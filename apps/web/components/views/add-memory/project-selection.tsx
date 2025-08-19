import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/select';
import { Plus } from 'lucide-react';

interface Project {
  id?: string;
  containerTag: string;
  name: string;
}

interface ProjectSelectionProps {
  projects: Project[];
  selectedProject: string;
  onProjectChange: (value: string) => void;
  onCreateProject: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  id?: string;
}

export function ProjectSelection({
  projects,
  selectedProject,
  onProjectChange,
  onCreateProject,
  disabled = false,
  isLoading = false,
  className = '',
  id = 'project-select',
}: ProjectSelectionProps) {
  const handleValueChange = (value: string) => {
    if (value === 'create-new-project') {
      onCreateProject();
    } else {
      onProjectChange(value);
    }
  };

  return (
    <Select
      key={`${id}-${selectedProject}`}
      disabled={isLoading || disabled}
      onValueChange={handleValueChange}
      value={selectedProject}
    >
      <SelectTrigger
        className={`bg-white/5 border-white/10 text-white ${className}`}
        id={id}
      >
        <SelectValue placeholder="Select a project" />
      </SelectTrigger>
      <SelectContent
        className="bg-black/90 backdrop-blur-xl border-white/10 z-[90]"
        position="popper"
        sideOffset={5}
      >
        <SelectItem
          className="text-white hover:bg-white/10"
          key="default"
          value="sm_project_default"
        >
          Default Project
        </SelectItem>
        {projects
          .filter((p) => p.containerTag !== 'sm_project_default' && p.id)
          .map((project) => (
            <SelectItem
              className="text-white hover:bg-white/10"
              key={project.id || project.containerTag}
              value={project.containerTag}
            >
              {project.name}
            </SelectItem>
          ))}
        <SelectItem
          className="text-white hover:bg-white/10 border-t border-white/10 mt-1"
          key="create-new"
          value="create-new-project"
        >
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Create new project</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
