import {
  Activity,
  ActivityType,
  Challenge,
  FocusArea,
  UserProfile,
} from "@/app/types";

export const USER_PROFILE_STORAGE_KEY = "hustlehub:userProfile";
export const ONBOARDING_COMPLETE_STORAGE_KEY = "hustlehub:onboardingComplete";
export const USER_PROFILE_OWNER_STORAGE_KEY = "hustlehub:userProfileOwner";

export const DEFAULT_AVATAR =
  "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";
export const DEFAULT_POST_LIMIT = 40;

const isoHoursAgo = (hours: number) =>
  new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export const createWelcomeActivity = (profile: UserProfile): Activity => ({
  id: `${Date.now() + 1}`,
  user: profile.name,
  username: profile.username,
  avatar: profile.avatar,
  type: ActivityType.StartupTask,
  description: `Just joined HustleHub! Ready to start building and connecting. My focus is on ${profile.focuses.join(
    ", "
  )}. Let's go! 🚀`,
  stats: "Joined the community",
  kudos: 0,
  likedByCurrentUser: false,
  likedBy: [],
  comments: [],
  timestamp: "Just now",
  timestampExact: new Date().toISOString(),
});

export const MOCK_USER_PROFILES: Record<string, UserProfile> = {
  alexdevito: {
    username: "alexdevito",
    name: "Alex Devito",
    avatar: "https://i.pravatar.cc/150?u=alexdevito",
    tagline: "Building the future of SaaS.",
    projects: [
      { name: "ShipFast", url: "https://shipfast.co" },
      { name: "AI-Writer" },
    ],
    focuses: [FocusArea.DeepWork, FocusArea.Startup, FocusArea.Fitness],
    connections: ["jennamiles"],
    socials: {
      twitter: "https://twitter.com/alexdevito",
      github: "https://github.com/alexdevito",
      website: "https://alexdevito.com",
    },
  },
  jennamiles: {
    username: "jennamiles",
    name: "Jenna Miles",
    avatar: "https://i.pravatar.cc/150?u=jennamiles",
    tagline: "Founder & Marathon Runner.",
    projects: [
      { name: "ZenRun", url: "https://zenrun.com" },
      { name: "WellnessHub" },
    ],
    focuses: [FocusArea.Fitness, FocusArea.Recharge, FocusArea.Networking],
    connections: ["alexdevito", "samuraisam"],
    socials: {
      linkedin: "https://linkedin.com/in/jennamiles",
      website: "https://zenrun.com",
    },
  },
  samuraisam: {
    username: "samuraisam",
    name: "Samurai Sam",
    avatar: "https://i.pravatar.cc/150?u=samuraisam",
    tagline: "Lifting weights and building startups.",
    projects: [{ name: "LiftLog" }, { name: "ProteinPlus" }],
    focuses: [FocusArea.Fitness, FocusArea.Startup],
    connections: ["jennamiles"],
  },
  techguru: {
    username: "techguru",
    name: "Tech Guru",
    avatar: "https://i.pravatar.cc/150?u=techguru",
    tagline: "Coding the matrix.",
    projects: [{ name: "NeuralNet Inc." }],
    focuses: [FocusArea.DeepWork],
    connections: [],
  },
};

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    user: "Alex Devito",
    username: "alexdevito",
    avatar: "https://i.pravatar.cc/150?u=alexdevito",
    type: ActivityType.DeepWork,
    description:
      "Just pushed the final feature for our MVP launch. The grind is real but so rewarding!",
    stats: "4 hours focus",
    image: "https://picsum.photos/seed/code1/600/400",
    kudos: 128,
    comments: [
      {
        id: "1",
        user: "Jenna Miles",
        avatar: "https://i.pravatar.cc/150?u=jennamiles",
        text: "Congrats on the launch! 🔥",
        replies: [
          {
            id: "101",
            user: "Alex Devito",
            avatar: "https://i.pravatar.cc/150?u=alexdevito",
            text: "Thanks Jenna! Appreciate the support.",
          },
        ],
      },
      {
        id: "2",
        user: "Samurai Sam",
        avatar: "https://i.pravatar.cc/150?u=samuraisam",
        text: "This is huge! Well done.",
      },
    ],
    timestamp: "2h ago",
    timestampExact: isoHoursAgo(2),
  },
  {
    id: "2",
    user: "Jenna Miles",
    username: "jennamiles",
    avatar: "https://i.pravatar.cc/150?u=jennamiles",
    type: ActivityType.Recharge,
    description:
      "Cleared my head with a morning run. Sometimes you need to disconnect to reconnect.",
    stats: "5km run",
    image: "https://picsum.photos/seed/run1/600/400",
    kudos: 95,
    comments: [
      {
        id: "3",
        user: "Alex Devito",
        avatar: "https://i.pravatar.cc/150?u=alexdevito",
        text: "Love this! So important.",
      },
    ],
    timestamp: "5h ago",
    timestampExact: isoHoursAgo(5),
  },
  {
    id: "3",
    user: "Samurai Sam",
    username: "samuraisam",
    avatar: "https://i.pravatar.cc/150?u=samuraisam",
    type: ActivityType.Workout,
    description:
      "Early morning lift to start the day strong. Building a business is a marathon, not a sprint.",
    stats: "1.5 hours workout",
    kudos: 210,
    comments: [],
    timestamp: "8h ago",
    timestampExact: isoHoursAgo(8),
  },
];

export const MOCK_CHALLENGES: Challenge[] = [
  {
    id: "mvp-30-day",
    title: "30-Day MVP Build",
    description:
      'Launch an MVP in 30 days. Stay accountable with daily check-ins by logging a "Startup Task" every day.',
    badge: "🚀",
    type: ActivityType.StartupTask,
    goal: 30,
    trackingMethod: "streak",
    participants: 42,
  },
  {
    id: "founder-fitness-20",
    title: "20 Workout Hustle",
    description:
      'Commit to 20 workouts. A healthy founder is a productive founder. Log your "Workout" sessions to advance.',
    badge: "💪",
    type: ActivityType.Workout,
    goal: 20,
    trackingMethod: "count",
    participants: 128,
  },
  {
    id: "networking-ninja-10",
    title: "Networking Ninja",
    description:
      'Expand your circle. Log 10 "Networking" activities, from coffee chats to industry events.',
    badge: "🤝",
    type: ActivityType.Networking,
    goal: 10,
    trackingMethod: "count",
    participants: 73,
  },
];

export const generateLocalId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const isMongoObjectId = (value: string) =>
  /^[0-9a-fA-F]{24}$/.test(value);