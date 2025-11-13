import React, { useState, ChangeEvent, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import type { ProjectLink, UserProfile } from "@/app/types";
import apiClient from "@/libs/api";
import { CameraIcon } from "../icons/CameraIcon";
import { optimizeImageFile } from "@/app/dashboard/lib/image-optimizer";
import { sanitizeProjectLinksForPersistence } from "@/libs/projects";
import ProjectEditorList from "../projects/ProjectEditorList";

interface Step2Props {
  onNext: (data: Omit<UserProfile, "focuses">) => void;
  onBack: () => void;
  initialData: Omit<UserProfile, "focuses">;
}

const createEmptyProject = (): ProjectLink => ({ name: "", url: "" });

const OnboardingStep2: React.FC<Step2Props> = ({
  onNext,
  onBack,
  initialData,
}) => {
  const [data, setData] = useState(() => ({
    ...initialData,
    projects:
      initialData.projects.length > 0
        ? initialData.projects.map((project) => ({ ...project }))
        : [createEmptyProject()],
  }));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
    };
  }, []);

  const ensureProjectsArray = () => {
    setData((prev) => {
      if (prev.projects.length > 0) {
        return prev;
      }
      return {
        ...prev,
        projects: [createEmptyProject()],
      };
    });
  };

  useEffect(() => {
    ensureProjectsArray();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setData({
      ...initialData,
      projects:
        initialData.projects.length > 0
          ? initialData.projects.map((project) => ({ ...project }))
          : [createEmptyProject()],
    });
  }, [initialData]);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = objectUrl;
    setAvatarFile(file);
    setData((prev) => ({ ...prev, avatar: objectUrl }));
    e.target.value = "";
  };

  const handleProjectChange = (
    index: number,
    field: keyof ProjectLink,
    value: string
  ) => {
    setData((prev) => {
      const nextProjects = prev.projects.map((project, projectIndex) =>
        projectIndex === index ? { ...project, [field]: value } : project
      );
      return {
        ...prev,
        projects: nextProjects,
      };
    });
  };

  const handleAddProject = () => {
    setData((prev) => ({
      ...prev,
      projects: [...prev.projects, createEmptyProject()],
    }));
  };

  const handleRemoveProject = (index: number) => {
    setData((prev) => {
      const nextProjects = prev.projects.filter(
        (_, projectIndex) => projectIndex !== index
      );
      return {
        ...prev,
        projects:
          nextProjects.length > 0 ? nextProjects : [createEmptyProject()],
      };
    });
  };

  const handleNext = async () => {
    if (!data.name.trim()) {
      toast.error("Please enter your name or a handle.");
      return;
    }

    try {
      let avatarUrl = data.avatar;
      let fileToUpload = avatarFile;

      if (!fileToUpload && avatarUrl?.startsWith("data:")) {
        try {
          const response = await fetch(avatarUrl);
          const blob = await response.blob();
          const extension = blob.type.split("/")[1] || "png";
          fileToUpload = new File([blob], `avatar-${Date.now()}.${extension}`, {
            type: blob.type || "image/png",
          });
        } catch (error) {
          console.error("Failed to convert onboarding avatar", error);
        }
      }

      if (fileToUpload) {
        const optimizedFile = await optimizeImageFile(fileToUpload, {
          preset: "avatar",
        });

        const { uploadUrl, fileUrl } = (await apiClient.post("/uploads", {
          fileName: optimizedFile.name,
          fileType: optimizedFile.type,
        })) as { uploadUrl: string; fileUrl: string };

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": optimizedFile.type,
          },
          body: optimizedFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("Avatar upload failed.");
        }

        avatarUrl = fileUrl;
      } else if (avatarUrl?.startsWith("blob:")) {
        avatarUrl = undefined;
      } else if (!avatarUrl) {
        avatarUrl =
          "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
      }

      const sanitizedProjects = sanitizeProjectLinksForPersistence(
        data.projects
      );

      const generatedUsername =
        data.name.toLowerCase().replace(/\s+/g, "") +
        Math.floor(Math.random() * 1000);

      onNext({
        ...data,
        avatar: avatarUrl,
        username: generatedUsername,
        connections: [],
        projects: sanitizedProjects,
      });

      if (avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarFile(null);
    } catch (error) {
      console.error(error);
      toast.error("Unable to upload your avatar. Please try again.");
    }
  };

  return (
    <div className="bg-brand-secondary border border-brand-border p-8 rounded-xl shadow-lg space-y-6 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tighter text-brand-text-primary font-display">
          Set Up Your Profile
        </h1>
        <p className="text-brand-text-secondary mt-1">
          This is how other hustlers will see you.
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <img
            src={data.avatar}
            alt="Profile"
            className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-tertiary"
          />
          <label
            htmlFor="avatar-upload"
            className="absolute -bottom-1 -right-1 bg-brand-neon text-brand-primary p-2 rounded-full cursor-pointer hover:bg-green-400 transition-all"
          >
            <CameraIcon />
            <input
              id="avatar-upload"
              name="avatar-upload"
              type="file"
              className="sr-only"
              onChange={handleAvatarChange}
              accept="image/*"
            />
          </label>
        </div>
        <input
          type="text"
          name="name"
          value={data.name}
          onChange={handleChange}
          placeholder="Name or Handle"
          className="w-full text-center text-xl bg-transparent border-b-2 border-brand-tertiary focus:border-brand-neon focus:outline-none p-2 transition-colors"
        />
      </div>

      <div className="space-y-4">
        <input
          type="text"
          name="tagline"
          value={data.tagline}
          onChange={handleChange}
          placeholder="Optional: Short tagline (e.g., AI founder)"
          className="w-full bg-brand-tertiary border border-brand-border rounded-md p-3 focus:ring-2 focus:ring-brand-neon focus:border-transparent transition-colors"
        />

        <ProjectEditorList
          projects={data.projects}
          onProjectChange={handleProjectChange}
          onAddProject={handleAddProject}
          onRemoveProject={handleRemoveProject}
          label="Optional: My Projects"
          helperText="Add the product, idea, or experiment you're working on. Links are optional."
        />
      </div>

      <div className="flex space-x-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full flex justify-center py-3 px-4 border border-brand-border rounded-md shadow-sm text-sm font-bold text-brand-text-secondary bg-brand-tertiary hover:bg-brand-border transition-all duration-200"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-brand-primary bg-brand-neon hover:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-brand-neon transition-all duration-200 shadow-lg shadow-brand-neon/20"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default OnboardingStep2;
