import React from "react";
import type { ProjectLink } from "@/app/types";
import { TrashIcon } from "../icons/TrashIcon";

interface ProjectEditorListProps {
  projects: ProjectLink[];
  onProjectChange: (index: number, field: keyof ProjectLink, value: string) => void;
  onAddProject: () => void;
  onRemoveProject: (index: number) => void;
  label?: string;
  helperText?: string;
  addButtonLabel?: string;
  className?: string;
}

const ProjectEditorList: React.FC<ProjectEditorListProps> = ({
  projects,
  onProjectChange,
  onAddProject,
  onRemoveProject,
  label,
  helperText,
  addButtonLabel = "+ Add Project",
  className,
}) => {
  return (
    <div className={className ?? "space-y-3"}>
      {label && (
        <p className="text-sm font-medium text-brand-text-secondary">{label}</p>
      )}
      {helperText && (
        <p className="text-sm text-brand-text-secondary/80">{helperText}</p>
      )}
      {projects.map((project, index) => (
        <div
          key={`project-${index}`}
          className="flex items-center space-x-2 animate-fade-in"
        >
          <input
            type="text"
            placeholder="Project name"
            value={project.name}
            onChange={(event) =>
              onProjectChange(index, "name", event.target.value)
            }
            className="flex-grow bg-brand-tertiary border border-brand-border rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors"
          />
          <input
            type="text"
            placeholder="Link (optional)"
            value={project.url ?? ""}
            onChange={(event) =>
              onProjectChange(index, "url", event.target.value)
            }
            className="flex-grow bg-brand-tertiary border border-brand-border rounded-md p-2 text-sm focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors"
          />
          <button
            type="button"
            onClick={() => onRemoveProject(index)}
            className="p-2 text-brand-text-secondary hover:text-red-500 transition-colors"
            aria-label="Remove project"
          >
            <TrashIcon />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAddProject}
        className="w-full text-sm font-semibold text-brand-neon text-center p-2 rounded-md bg-brand-tertiary hover:bg-brand-border transition-colors"
      >
        {addButtonLabel}
      </button>
    </div>
  );
};

export default ProjectEditorList;