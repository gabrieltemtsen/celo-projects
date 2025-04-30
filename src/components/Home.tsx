/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/rules-of-hooks */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState, useCallback, useMemo } from "react";
import sdk from "@farcaster/frame-sdk";
import TinderCard from "react-tinder-card";
import {
  ArrowLeft,
  ExternalLink,
  X,
  Heart,
  Video,
  ChevronDown,
  Loader2,
} from "lucide-react";
import {
  useAccount,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { celo, base } from "wagmi/chains";
import { parseEther, isAddress } from "viem";
import { motion, AnimatePresence } from "framer-motion";

// Program type from API
interface Program {
  programId: string;
  name: string;
  description: string;
  problem?: string;
  chainID: number;
  metadata: {
    startDate: string;
    createdAt: number;
    type: string; // "program" or "grant"
  };
  createdAt: string;
}

// Project type for /projects/by-program
interface ProgramProject {
  uid: string;
  projectDetails: {
    data: {
      title: string;
      description: string;
      problem?: string;
      solution?: string;
      imageURL: string;
      links: { type: string; url: string }[];
      payoutAddress?: string;
    };
  };
  grant_details: {
    description: string;
  };
  program?: { programId: string }[];
}

interface GrantProject {
  uid: string;
  projectDetails: {
    data: {
      title: string;
      description: string;

      imageURL: string;
      links: { type: string; url: string }[];
      problem?: string;
      solution?: string;
      payoutAddress?: string;
    };
  };
  details: {
    description: string;
  };
  program: { programId: string }[];
}

// Union type for projects
type Project = ProgramProject | GrantProject;

// Season type
interface Season {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isGrant: boolean;
  chainID: number;
}

// UI Project type
interface UIProject {
  id: string;
  title: string;
  banner: string;
  problem: string;
  isGrant: boolean;
  solution: string;
  videoUrl?: string;
  demoUrl: string;
  tags?: string[];
  season: string;
  payoutAddress?: string;
}

const celoImageURL =
  "https://99bitcoins.com/wp-content/uploads/2024/08/CELOcrypto-768x436.jpg";

// Simple markdown parser for bold (*text*) and italic (_text_)
const parseMarkdown = (text: string): string => {
  const escapeHtml = (unsafe: string): string =>
    unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  let formatted = escapeHtml(text);
  formatted = formatted
    .replace(/\*([^*]+)\*/g, '<strong class="font-bold">$1</strong>')
    .replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  return formatted;
};

// Custom hook to handle transaction statuses
const useTransactionStatuses = (transactionHashes: {
  [projectId: string]: `0x${string}`;
}) => {
  const statuses: { [projectId: string]: string } = {};

  Object.entries(transactionHashes).forEach(([projectId, hash]) => {
    const { isLoading, isSuccess, error } = useWaitForTransactionReceipt({
      hash,
    });
    statuses[projectId] = error
      ? `Error: ${error.message}`
      : isLoading
        ? "Confirming"
        : isSuccess
          ? "Confirmed"
          : "Pending";
  });

  return statuses;
};

export default function FrameApp() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allProjects, setAllProjects] = useState<UIProject[]>([]);
  const [currentSeasonId, setCurrentSeasonId] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProjects, setLikedProjects] = useState<UIProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [direction, setDirection] = useState<string | null>(null);
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [swipeFeedback, setSwipeFeedback] = useState<string | null>(null);
  const [transactionHashes, setTransactionHashes] = useState<{
    [projectId: string]: `0x${string}`;
  }>({});
  const [transactionErrors, setTransactionErrors] = useState<{
    [projectId: string]: string;
  }>({});
  const [isDonating, setIsDonating] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Wallet hooks
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending: isConnectPending } = useConnect();
  const { disconnect, isPending: isDisconnectPending } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchChainPending } = useSwitchChain();
  const { sendTransaction, isPending: isSendTxPending } = useSendTransaction();

  // Transaction statuses
  const transactionStatuses = useTransactionStatuses(transactionHashes);

  // Celo-inspired color palette
  const celoColors = {
    gold: "#FBCC5C",
    green: "#35D07F",
    darkGreen: "#2B7B5B",
    neutral: "#F5F6F5",
    dark: "#121212",
  };

  // Target chain based on season type
  const currentSeason = useMemo(
    () => seasons.find((season) => season.id === currentSeasonId),
    [seasons, currentSeasonId],
  );
  const targetChain = celo;

  // Load liked projects from localStorage on mount
  useEffect(() => {
    const storedLikedProjects = localStorage.getItem("likedProjects");
    if (storedLikedProjects) {
      try {
        const parsed = JSON.parse(storedLikedProjects) as UIProject[];
        setLikedProjects(parsed);
      } catch (error) {
        console.error("Error parsing liked projects from localStorage:", error);
      }
    }
  }, []);

  // Save liked projects to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("likedProjects", JSON.stringify(likedProjects));
    } catch (error) {
      console.error("Error saving liked projects to localStorage:", error);
    }
  }, [likedProjects]);

  // Fetch programs on mount
  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          "https://gapapi.karmahq.xyz/communities/celo/programs",
        );
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const programs: Program[] = await response.json();

        const mappedSeasons: Season[] = programs.map((program) => ({
          id: program.programId,
          name: program.name,
          description: program.description,
          startDate:
            program.metadata.startDate ||
            new Date(program.createdAt).toISOString().split("T")[0],
          endDate: new Date(program.createdAt).toISOString().split("T")[0],
          isGrant: program.metadata.type === "program",
          chainID: program.chainID,
        }));

        setSeasons(mappedSeasons);
        if (mappedSeasons.length > 0) {
          setCurrentSeasonId(mappedSeasons[0].id);
        }
      } catch (error) {
        console.error("Error fetching programs:", error);
        setWalletError("Failed to fetch programs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    sdk.actions.ready();
    fetchPrograms();

    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
    }
  }, []);

  // Fetch projects when season changes
  useEffect(() => {
    if (!currentSeasonId) return;

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const season = seasons.find((s) => s.id === currentSeasonId);
        if (!season) throw new Error("Season not found");

        let projects: Project[] = [];
        if (season.isGrant) {
          const response = await fetch(
            `https://gapapi.karmahq.xyz/communities/celo/grants?page=0&pageLimit=12&status=all&sort=milestones&selectedProgramIds=${currentSeasonId}_${season.chainID}`,
          );
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          const grantResponse = await response.json();
          projects = grantResponse.data as Project[];
        } else {
          const response = await fetch(
            `https://gapapi.karmahq.xyz/projects/by-program?programId=${currentSeasonId}&chainId=42220&communityId=celo`,
          );
          if (!response.ok) throw new Error(`HTTP error ${response.status}`);
          projects = await response.json();
        }

        const mappedProjects: UIProject[] = projects.map((project) => {
          const isGrantProject = "details" in project;
          const projectDetails = isGrantProject
            ? (project as GrantProject).projectDetails.data
            : (project as ProgramProject).projectDetails.data;
          const grantDescription = isGrantProject
            ? (project as GrantProject).details.description
            : (project as ProgramProject).grant_details.description;

          const getProblem = (): string => {
            if (isGrantProject && projectDetails.problem)
              return projectDetails.problem;
            if (grantDescription) {
              const problemPart = grantDescription
                .split("##")
                .find((part) => part.includes("Why it Matters"));
              if (problemPart) return problemPart.trim();
            }
            return projectDetails.description.split("\n").slice(0, 2).join(" ");
          };

          const getSolution = (): string => {
            if (isGrantProject && projectDetails.solution)
              return projectDetails.solution;
            if (grantDescription) {
              const solutionPart = grantDescription
                .split("##")
                .find((part) => part.includes("How it works"));
              if (solutionPart) return solutionPart.trim();
            }
            return projectDetails.description.split("\n").slice(2, 4).join(" ");
          };

          const problem = getProblem() || "No problem description available";
          const solution = getSolution() || "No solution description available";

          return {
            id: project.uid,
            title: projectDetails.title || "Untitled Project",
            banner: projectDetails.imageURL.startsWith("baf")
              ? `https://ipfs.io/ipfs/${projectDetails.imageURL}`
              : projectDetails.imageURL || celoImageURL,
            problem: parseMarkdown(problem),
            solution: parseMarkdown(solution),
            videoUrl: projectDetails.links.find(
              (link) => link.type === "youtube",
            )?.url,
            demoUrl:
              projectDetails.links.find((link) => link.type === "website")
                ?.url || "https://gap.karmahq.xyz",
            tags: projectDetails.links
              .map((link) => link.type)
              .filter((type) => type !== "website"),
            season: currentSeasonId,
            isGrant: season.isGrant,
            payoutAddress: projectDetails.payoutAddress || "",
          };
        });

        setAllProjects(mappedProjects);
        setCurrentIndex(0);
        setShowVideo(false);
      } catch (error) {
        console.error("Error fetching projects:", error, {
          seasonId: currentSeasonId,
        });
        setWalletError("Failed to fetch projects. Please try again.");
        setAllProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [currentSeasonId, seasons]);

  // Memoized computations
  const filteredProjects = useMemo(
    () => allProjects.filter((project) => project.season === currentSeasonId),
    [allProjects, currentSeasonId],
  );

  const currentProject = useMemo(
    () => filteredProjects[currentIndex],
    [filteredProjects, currentIndex],
  );

  const outOfProjects = currentIndex >= filteredProjects.length;

  const handleSwipe = useCallback(
    (dir: string) => {
      setDirection(dir);
      setSwipeFeedback(dir === "right" ? "Liked!" : "Passed");

      if (dir === "right" && currentProject) {
        setLikedProjects((prev) =>
          prev.some((p) => p.id === currentProject.id)
            ? prev
            : [
                ...prev,
                {
                  ...currentProject,
                  payoutAddress: currentProject.payoutAddress || "",
                },
              ],
        );
      }

      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setDirection(null);
        setSwipeFeedback(null);
      }, 300);
    },
    [currentProject],
  );

  const goToDemo = useCallback(() => {
    if (currentProject?.demoUrl) {
      sdk.actions.openUrl(currentProject.demoUrl);
    }
  }, [currentProject]);

  const toggleVideo = useCallback(() => {
    if (currentProject?.videoUrl) {
      setShowVideo((prev) => !prev);
    }
  }, [currentProject]);

  const changeSeason = useCallback((seasonId: string) => {
    setCurrentSeasonId(seasonId);
    setShowSeasonSelector(false);
  }, []);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem("hasSeenOnboarding", "true");
  }, []);

  const handleConnectWallet = useCallback(() => {
    setWalletError(null);
    try {
      connect({ connector: connectors[0] });
    } catch (error) {
      console.error("Wallet connection failed:", error);
      setWalletError("Failed to connect wallet. Please try again.");
    }
  }, [connect, connectors]);

  const handleSwitchChain = useCallback(() => {
    setWalletError(null);
    try {
      switchChain({ chainId: targetChain.id });
    } catch (error) {
      console.error("Chain switch failed:", error, {
        targetChainId: targetChain.id,
      });
      setWalletError(
        `Failed to switch to ${targetChain.name}. Please try again.`,
      );
    }
  }, [switchChain, targetChain]);

  const sendDonations = useCallback(async () => {
    if (!isConnected) {
      setWalletError("Please connect your wallet.");
      return;
    }
    if (chainId !== targetChain.id) {
      setWalletError(`Please switch to ${targetChain.name}.`);
      return;
    }

    setIsDonating(true);
    setTransactionHashes({});
    setTransactionErrors({});
    setWalletError(null);

    for (const project of likedProjects) {
      if (!project.payoutAddress) {
        console.warn(
          "No payout address for project:",
          project.id,
          project.title,
        );
        setTransactionErrors((prev) => ({
          ...prev,
          [project.id]: "No payout address available",
        }));
        continue;
      }

      if (!isAddress(project.payoutAddress)) {
        console.warn(
          "Invalid payout address for project:",
          project.id,
          project.payoutAddress,
        );
        setTransactionErrors((prev) => ({
          ...prev,
          [project.id]: "Invalid payout address",
        }));
        continue;
      }

      try {
        const value =
          targetChain.id === celo.id
            ? parseEther("0.1")
            : parseEther("0.00004");

        await new Promise<void>((resolve, reject) => {
          sendTransaction(
            {
              to: project.payoutAddress as `0x${string}`,
              value,
            },
            {
              onSuccess: (hash) => {
                console.log("Transaction sent:", {
                  projectId: project.id,
                  hash,
                });
                setTransactionHashes((prev) => ({
                  ...prev,
                  [project.id]: hash,
                }));
                resolve();
              },
              onError: (error) => {
                console.error("Transaction failed:", {
                  projectId: project.id,
                  error,
                });
                setTransactionErrors((prev) => ({
                  ...prev,
                  [project.id]: error.message,
                }));
                reject(error);
              },
            },
          );
        });
      } catch (error) {
        console.error("Transaction error:", { projectId: project.id, error });
        setTransactionErrors((prev) => ({
          ...prev,
          [project.id]: (error as Error).message,
        }));
      }
    }

    setIsDonating(false);
  }, [isConnected, chainId, targetChain, likedProjects, sendTransaction]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-neutral-50 dark:bg-neutral-900">
        {/* Spinner + label */}
        <Loader2 className="w-12 h-12 text-green-500 animate-spin mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Loading projects…
        </p>

        {/* Skeleton “card” */}
        <div className="w-11/12 max-w-md space-y-6">
          {/* Header skeleton */}
          <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded-lg animate-pulse" />
          {/* Subheader skeleton */}
          <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-lg w-3/4 animate-pulse" />
          {/* Image/banner skeleton */}
          <div className="h-48 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          {/* Text lines skeleton */}
          <div className="space-y-2">
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-md mx-auto w-full p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-poppins">
      {walletError && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-2xl flex items-center animate-fade-in">
          <span>{walletError}</span>
          <button onClick={() => setWalletError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {showOnboarding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Welcome to Celo Projects
            </h2>
            <p className="text-gray-600 mb-6">
              Swipe <span className="text-green-500 font-semibold">right</span>{" "}
              to like a project and endorse it, or swipe{" "}
              <span className="text-red-500 font-semibold">left</span> to pass.
            </p>
            <div className="flex justify-center gap-4 mb-6">
              <div className="flex flex-col items-center">
                <Heart className="text-green-500 w-8 h-8 mb-2" />
                <span className="text-sm text-gray-600">Swipe Right</span>
              </div>
              <div className="flex flex-col items-center">
                <X className="text-red-500 w-8 h-8 mb-2" />
                <span className="text-sm text-gray-600">Swipe Left</span>
              </div>
            </div>
            <button
              onClick={closeOnboarding}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      <div className="mb-4">
        {isConnected ? (
          <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <span className="text-sm text-gray-800">
              Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <button
              onClick={() => disconnect()}
              disabled={isDisconnectPending}
              className="px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all duration-200 disabled:bg-gray-400 flex items-center"
            >
              {isDisconnectPending && (
                <Loader2 size={16} className="mr-2 animate-spin" />
              )}
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectWallet}
            disabled={isConnectPending || isConnecting}
            className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:bg-gray-400 flex items-center justify-center"
          >
            {(isConnectPending || isConnecting) && (
              <Loader2 size={16} className="mr-2 animate-spin" />
            )}
            Connect Wallet
          </button>
        )}
        {isConnected && chainId !== targetChain.id && (
          <button
            onClick={handleSwitchChain}
            disabled={isSwitchChainPending}
            className="w-full mt-2 p-4 bg-yellow-500 text-white rounded-2xl font-semibold shadow-lg hover:bg-yellow-600 transition-all duration-300 disabled:bg-gray-400 flex items-center justify-center"
          >
            {isSwitchChainPending && (
              <Loader2 size={16} className="mr-2 animate-spin" />
            )}
            Switch to {targetChain.name}
          </button>
        )}
      </div>

      <div className="mb-4 sm:mb-6 relative z-10">
        <button
          onClick={() => setShowSeasonSelector((prev) => !prev)}
          className="flex items-center justify-between w-full p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 transition-all duration-200"
        >
          <div className="flex items-center">
            <div
              className="w-2 h-8 rounded-full mr-3"
              style={{ backgroundColor: celoColors.gold }}
            />
            <div>
              <span className="block text-sm font-semibold text-gray-800">
                {currentSeason?.name ?? "Select Program"}
              </span>
              <span className="block text-xs text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">
                {currentSeason?.description ?? "Choose a program"}
              </span>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-gray-500 transition-transform duration-200 ${showSeasonSelector ? "rotate-180" : ""}`}
          />
        </button>

        {showSeasonSelector && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-20 animate-slide-down">
            {seasons.map((season) => (
              <button
                key={season.id}
                onClick={() => changeSeason(season.id)}
                className={`flex items-center w-full p-4 hover:bg-gray-50 transition-colors duration-200 ${
                  season.id === currentSeasonId ? "bg-green-50" : ""
                }`}
              >
                <div
                  className="w-2 h-8 rounded-full mr-3"
                  style={{
                    backgroundColor:
                      season.id === currentSeasonId
                        ? celoColors.gold
                        : "#D1D5DB",
                  }}
                />
                <div className="text-left">
                  <span className="block text-sm font-semibold text-gray-800">
                    {season.name}
                  </span>
                  <span className="block text-xs text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">
                    {season.description}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full h-[50vh] max-h-[400px] min-h-[300px] overflow-hidden">
        {outOfProjects ? (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-green-50 to-gold-50 rounded-2xl shadow-lg text-center animate-fade-in p-4">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
              Program Complete!
            </h2>
            <p className="text-gray-600 mb-6 px-4">
              You&apos;ve reviewed all projects in{" "}
              {currentSeason?.name ?? "this program"}
            </p>
            <button
              onClick={() => setCurrentIndex(0)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center mb-4"
            >
              <ArrowLeft size={16} className="mr-2" />
              View Again
            </button>

            {likedProjects.length > 0 && (
              <div className="w-full p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Support Your Liked Projects
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send 0.1 USD to {likedProjects.length} liked project(s).
                </p>
                <button
                  onClick={sendDonations}
                  disabled={
                    !isConnected ||
                    chainId !== targetChain.id ||
                    isDonating ||
                    isSendTxPending
                  }
                  className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 disabled:bg-gray-400 flex items-center justify-center"
                >
                  {isDonating || isSendTxPending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Processing Donations...
                    </>
                  ) : (
                    "Donate to Liked Projects"
                  )}
                </button>
                {Object.entries(transactionStatuses).map(
                  ([projectId, status]) => (
                    <div key={projectId} className="mt-2 text-sm text-gray-600">
                      {likedProjects.find((p) => p.id === projectId)?.title ??
                        "Unknown Project"}
                      : {status}
                    </div>
                  ),
                )}
                {Object.entries(transactionErrors).map(([projectId, error]) => (
                  <div key={projectId} className="mt-2 text-sm text-red-500">
                    {likedProjects.find((p) => p.id === projectId)?.title ??
                      "Unknown Project"}
                    : {error}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative w-full h-full">
            {swipeFeedback && (
              <div className="absolute inset-0 flex items-center justify-center z-10 animate-fade-out">
                <div
                  className={`text-2xl sm:text-3xl font-bold ${
                    swipeFeedback === "Liked!"
                      ? "text-green-500"
                      : "text-red-500"
                  } bg-white/80 px-6 py-3 rounded-full shadow-lg`}
                >
                  {swipeFeedback}
                </div>
              </div>
            )}
            <AnimatePresence initial={false} custom={direction}>
              {currentProject && (
                <motion.div
                  key={currentProject.id}
                  className="absolute w-full h-full"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.4}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 100) handleSwipe("right");
                    else if (info.offset.x < -100) handleSwipe("left");
                  }}
                  custom={direction}
                  initial={{
                    x:
                      direction === "right"
                        ? -300
                        : direction === "left"
                          ? 300
                          : 0,
                    opacity: 0,
                  }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={
                    direction === "right"
                      ? { x: 300, opacity: 0 }
                      : { x: -300, opacity: 0 }
                  }
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  whileTap={{ cursor: "grabbing" }}
                >
                  <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden bg-white">
                    {/* —————————————————————————————————————————————— */}
                    {/* 1) Banner Image + Overlay */}
                    <div className="relative h-[45%]">
                      {/* project image */}
                      <img
                        src={currentProject?.banner ?? celoImageURL}
                        alt={currentProject?.title ?? "Project banner"}
                        className="w-full h-full object-cover"
                      />
                      {/* dark gradient so text stays legible */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      {/* season badge */}
                      <span className="absolute top-3 left-3 px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                        S{currentProject?.season}
                      </span>
                      {/* tags */}
                      {/* tags + title */}
                      <div className="absolute bottom-0 left-0 p-4 flex flex-col gap-1">
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                          {currentProject?.title ?? "Untitled"}
                        </h2>
                      </div>
                      {/* video toggle button (if any) */}
                      {currentProject?.videoUrl && (
                        <button
                          onClick={toggleVideo}
                          className="absolute top-3 right-3 bg-black/60 p-2 rounded-full hover:bg-black/80 transition-colors duration-200"
                        >
                          <Video size={20} className="text-white" />
                        </button>
                      )}
                    </div>

                    {/* —————————————————————————————————————————————— */}
                    {/* 2) Scrollable Info Panel */}
                    <div
                      className="relative p-4 max-h-[55%] overflow-y-auto bg-neutral-50"
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.currentTarget.style.overflowY = "auto";
                      }}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      {/* fading gradient hint */}
                      <div className="pointer-events-none absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-neutral-50" />

                      {/* bouncing arrow hint */}
                      <div className="pointer-events-none absolute bottom-2 left-1/2 transform -translate-x-1/2 animate-bounce">
                        <ChevronDown size={24} className="text-gray-400" />
                      </div>

                      {showVideo && currentProject?.videoUrl ? (
                        <iframe
                          src={currentProject.videoUrl}
                          className="w-full h-full rounded-lg"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <>
                          <div className="mb-3">
                            <h3 className="text-sm font-semibold text-gray-500">
                              {currentProject?.isGrant
                                ? "Problem"
                                : "Description"}
                            </h3>
                            <p
                              className="text-gray-800 text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html:
                                  currentProject?.problem ??
                                  "No problem description",
                              }}
                            />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-gray-500">
                              Solution
                            </h3>
                            <p
                              className="text-gray-800 text-sm leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html:
                                  currentProject?.solution ??
                                  "No solution description",
                              }}
                            />
                          </div>
                          <button
                            onClick={goToDemo}
                            className="flex items-center mt-4 text-green-600 font-semibold text-sm hover:text-green-700 transition-colors duration-200"
                          >
                            View Demo{" "}
                            <ExternalLink size={16} className="ml-1" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {!outOfProjects && (
        <div className="flex gap-2 justify-center my-4 sm:my-6">
          {filteredProjects.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "bg-green-500 scale-125" : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}

      {!outOfProjects && (
        <div className="flex justify-center gap-6 sm:gap-8 mt-4">
          <button
            onClick={() => handleSwipe("left")}
            className="p-4 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-red-50 hover:scale-110 transition-all duration-200"
          >
            <X size={24} className="text-red-500" />
          </button>
          <button
            onClick={() => handleSwipe("right")}
            className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg hover:from-green-600 hover:to-green-700 hover:scale-110 transition-all duration-300"
          >
            <Heart size={24} className="text-white" />
          </button>
        </div>
      )}

      <div className="mt-6 sm:mt-8 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>
            {currentSeason?.name ?? "Program"} • {filteredProjects.length}{" "}
            projects
          </span>
          <span>
            {currentSeason?.startDate ?? ""} - {currentSeason?.endDate ?? ""}
          </span>
        </div>
      </div>
    </div>
  );
}
