"use client";

import { useState, useRef } from "react";
import type { JSX } from "react";
import Image from "next/image";

interface Feature {
  title: string;
  description: string;
  type?: "video" | "image";
  path?: string;
  format?: string;
  alt?: string;
  svg?: JSX.Element;
}

// The features array is a list of features that will be displayed in the accordion.
// - title: The title of the feature
// - description: The description of the feature (when clicked)
// - type: The type of media (video or image)
// - path: The path to the media (for better SEO, try to use a local path)
// - format: The format of the media (if type is 'video')
// - alt: The alt text of the image (if type is 'image')
const features = [
  {
    title: "Log every hustle session",
    description:
      "Capture workouts, deep work sprints, investor prep, or recovery time in seconds. Tag each entry with mood and focus so you can spot patterns before burnout hits.",
    type: "image",
    path: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1600&q=80",
    alt: "Founder logging a workout and work session",
    svg: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 5.25h18M3 9.75h11.25M3 14.25h18M3 18.75h11.25"
        />
      </svg>
    ),
  },
  {
    title: "Share the journey",
    description:
      "Post stats, photos, and reflections to a feed of fellow founders. Swap kudos, comments, and high-fives while choosing private, team-only, or public visibility.",
    type: "image",
    path: "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1600&q=80",
    alt: "Community celebrating a product milestone",
    svg: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.25h9m-9 3H12m9 .75a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Challenges & accountability squads",
    description:
      "Join sprints like “30-Day MVP Build” or create your own accountability pod. Earn streaks, badges, and keep group chats buzzing with momentum.",
    svg: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 6a3 3 0 11-5.905.75M8.25 6A3 3 0 018.25 0m7.5 18.75a3 3 0 11-5.905.75M8.25 18.75A3 3 0 118.25 12m7.5-1.5v3.75M8.25 10.5v3.75"
        />
      </svg>
    ),
  },
  {
    title: "AI insights to keep balance",
    description:
      "Weekly summaries highlight your split between fitness, focus, and recovery. Get nudges when you lean too hard into work and forget to recharge.",
    svg: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.7 3.17a.75.75 0 01.6 0l7.5 3.214a.75.75 0 01.45.688v6.857a.75.75 0 01-.45.688l-7.5 3.214a.75.75 0 01-.6 0l-7.5-3.214a.75.75 0 01-.45-.688V7.072a.75.75 0 01.45-.688l7.5-3.214z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 10.5l6 2.25 6-2.25M12 12.75v6.75"
        />
      </svg>
    ),
  },
  {
    title: "Network with intent",
    description:
      "Match with nearby founders for co-working, find virtual coffee partners chasing similar goals, and expand your circle without leaving the product build.",
    svg: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 7.5a3 3 0 11-6 0 3 3 0 016 0zM4.5 21a7.5 7.5 0 0115 0M19.5 7.5h.008v.008H19.5V7.5zm0 3h.008v.008H19.5V10.5zm0 3h.008v.008H19.5V13.5zm0 3h.008v.008H19.5V16.5z"
        />
      </svg>
    ),
  },
] as Feature[];

// An SEO-friendly accordion component including the title and a description (when clicked.)
const Item = ({
  feature,
  isOpen,
  setFeatureSelected,
}: {
  index: number;
  feature: Feature;
  isOpen: boolean;
  setFeatureSelected: () => void;
}) => {
  const accordion = useRef(null);
  const { title, description, svg } = feature;

  return (
    <li>
      <button
        className="relative flex gap-2 items-center w-full py-5 text-base font-medium text-left md:text-lg text-white"
        onClick={(e) => {
          e.preventDefault();
          setFeatureSelected();
        }}
        aria-expanded={isOpen}
      >
        <span
          className={`duration-100 ${
            isOpen ? "text-brand-neon" : "text-white/50"
          }`}
        >
          {svg}
        </span>
        <span
          className={`flex-1 ${
            isOpen ? "text-brand-neon font-semibold" : "text-white/80"
          }`}
        >
          <h3 className="inline">{title}</h3>
        </span>
      </button>

      <div
        ref={accordion}
        className={`transition-all duration-300 ease-in-out text-white/70 overflow-hidden`}
        style={
          isOpen
            ? { maxHeight: accordion?.current?.scrollHeight, opacity: 1 }
            : { maxHeight: 0, opacity: 0 }
        }
      >
        <div className="pb-5 leading-relaxed">{description}</div>
      </div>
    </li>
  );
};

// A component to display the media (video or image) of the feature. If the type is not specified, it will display an empty div.
// Video are set to autoplay for best UX.
const Media = ({ feature }: { feature: Feature }) => {
  const { type, path, format, alt } = feature;
  const style =
    "rounded-2xl aspect-square w-full sm:w-[26rem] border border-brand-tertiary/40 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.7)]";
  const size = {
    width: 500,
    height: 500,
  };

  if (type === "video") {
    return (
      <video
        className={style}
        autoPlay
        muted
        loop
        playsInline
        controls
        width={size.width}
        height={size.height}
      >
        <source src={path} type={format} />
      </video>
    );
  } else if (type === "image") {
    return (
      <Image
        src={path}
        alt={alt}
        className={`${style} object-cover object-center`}
        width={size.width}
        height={size.height}
      />
    );
  } else {
    return <div className={`${style} !border-none`}></div>;
  }
};

// A component to display 2 to 5 features in an accordion.
// By default, the first feature is selected. When a feature is clicked, the others are closed.
const FeaturesAccordion = () => {
  const [featureSelected, setFeatureSelected] = useState<number>(0);

  return (
    <section className="bg-brand-primary text-white" id="features">
      <div className="py-24 md:py-32 space-y-24 md:space-y-32 max-w-7xl mx-auto px-8">
        <h2 className="font-extrabold text-4xl lg:text-6xl tracking-tight mb-12 md:mb-24">
          All you need to ship your startup fast
          <span className="bg-brand-tertiary text-brand-neon px-2 md:px-4 ml-1 md:ml-1.5 leading-relaxed whitespace-nowrap rounded-full">
            and get profitable
          </span>
        </h2>
        <div className=" flex flex-col md:flex-row gap-12 md:gap-24">
          <div className="grid grid-cols-1 items-stretch gap-8 sm:gap-12 lg:grid-cols-2 lg:gap-20">
            <ul className="w-full">
              {features.map((feature, i) => (
                <Item
                  key={feature.title}
                  index={i}
                  feature={feature}
                  isOpen={featureSelected === i}
                  setFeatureSelected={() => setFeatureSelected(i)}
                />
              ))}
            </ul>

            <Media feature={features[featureSelected]} key={featureSelected} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesAccordion;
