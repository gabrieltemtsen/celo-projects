/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useCallback, useMemo } from 'react';
import sdk from '@farcaster/frame-sdk';
import TinderCard from 'react-tinder-card';
import { ArrowRight, ArrowLeft, ExternalLink, X, Heart, Video, ChevronDown } from 'lucide-react';

// Program type from API
type Program = {
  programId: string;
  name: string;
  description: string;
  chainID: number;
  metadata: {
    startDate: string;
    createdAt: number;
    type: string; // "program" or "grant"
  };
  createdAt: string;
};

// Project type for /projects/by-program
type ProgramProject = {
  uid: string;
  projectDetails: {
    data: {
      title: string;
      description: string;
      imageURL: string;
      links: { type: string; url: string }[];
    };
  };
  grant_details: {
    description: string;
  };
  program?: { programId: string }[];
};

// Project type for /communities/celo/grants
type GrantProject = {
  uid: string;
  projectDetails: {
    data: {
      title: string;
      description: string;
      imageURL: string;
      links: { type: string; url: string }[];
      problem: string;
      solution: string;
    };
  };
  details: {
    description: string;
  };
  program: {
    programId: string;
  }[];
};

// Union type for projects
type Project = ProgramProject | GrantProject;

// Season type
type Season = {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isGrant: boolean;
  chainID: number;
};

// UI Project type
type UIProject = {
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
};

const celoImageURL = 'https://99bitcoins.com/wp-content/uploads/2024/08/CELOcrypto-768x436.jpg';

// Simple markdown parser for bold (*text*) and italic (_text_)
const parseMarkdown = (text: string): string => {
  // Escape HTML to prevent XSS
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '');
  };

  // Replace *text* with <strong>text</strong> and _text_ with <em>text</em>
  let formatted = escapeHtml(text);
  formatted = formatted
    .replace(/\*([^*]+)\*/g, '<strong class="font-bold">$1</strong>') // Bold
    .replace(/_([^_]+)_/g, '<em class="italic">$1</em>'); // Italic

  return formatted;
};

export default function FrameApp() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allProjects, setAllProjects] = useState<UIProject[]>([]);
  const [currentSeasonId, setCurrentSeasonId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProjects, setLikedProjects] = useState<UIProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [direction, setDirection] = useState<string | null>(null);
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [swipeFeedback, setSwipeFeedback] = useState<string | null>(null);

  // Celo-inspired color palette
  const celoColors = {
    gold: '#FBCC5C',
    green: '#35D07F',
    darkGreen: '#2B7B5B',
    neutral: '#F5F6F5',
    dark: '#121212',
  };

  // Load liked projects from localStorage on mount
  useEffect(() => {
    const storedLikedProjects = localStorage.getItem('likedProjects');
    if (storedLikedProjects) {
      setLikedProjects(JSON.parse(storedLikedProjects));
    }
  }, []);

  // Save liked projects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('likedProjects', JSON.stringify(likedProjects));
  }, [likedProjects]);

  // Fetch programs on mount
  useEffect(() => {
    async function fetchPrograms() {
      try {
        const response = await fetch('https://gapapi.karmahq.xyz/communities/celo/programs');
        const programs: Program[] = await response.json();

        const mappedSeasons: Season[] = programs.map(program => ({
          id: program.programId,
          name: program.name,
          description: program.description,
          startDate: program.metadata.startDate || new Date(program.createdAt).toISOString().split('T')[0],
          endDate: new Date(program.createdAt).toISOString().split('T')[0],
          isGrant: program.metadata.type === 'program', // Reverted to correct logic
          chainID: program.chainID,
        }));

        setSeasons(mappedSeasons);
        if (mappedSeasons.length > 0) {
          setCurrentSeasonId(mappedSeasons[0].id);
        }
      } catch (error) {
        console.error('Error fetching programs:', error);
      } finally {
        setLoading(false);
      }
    }

    sdk.actions.ready();
    fetchPrograms();

    // Check if onboarding has been shown
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (hasSeenOnboarding) {
      setShowOnboarding(false);
    }
  }, []);

  // Fetch projects when season changes
  useEffect(() => {
    if (!currentSeasonId) return;

    async function fetchProjects() {
      setLoading(true);
      try {
        const currentSeason = seasons.find(season => season.id === currentSeasonId);
        if (!currentSeason) return;

        let projects: Project[] = [];
        if (currentSeason.isGrant) {
          const response = await fetch(
            `https://gapapi.karmahq.xyz/communities/celo/grants?page=0&pageLimit=12&status=all&sort=milestones&selectedProgramIds=${currentSeasonId}_${currentSeason.chainID}`
          );
          const grantResponse = await response.json();
          projects = grantResponse.data;
        } else {
          const response = await fetch(
            `https://gapapi.karmahq.xyz/projects/by-program?programId=${currentSeasonId}&chainId=42220&communityId=celo`
          );
          projects = await response.json();
        }

        const mappedProjects: UIProject[] = projects.map(project => {
          const isGrantProject = 'details' in project;

          const projectDetails = isGrantProject
            ? (project as any).projectDetails.data
            : (project as any).projectDetails.data;

          const grantDescription = isGrantProject
            ? (project as GrantProject).details?.description
            : (project as ProgramProject).grant_details?.description;

          let problem: string;
          let solution: string;

          if (isGrantProject) {
            problem = projectDetails.problem ||
                      (grantDescription
                        ? grantDescription.split('##').find(part => part.includes('Why it Matters'))?.trim() ||
                          projectDetails.description.split('\n').slice(0, 2).join(' ')
                        : projectDetails.description.split('\n').slice(0, 2).join(' '));
            solution = projectDetails.solution ||
                       (grantDescription
                         ? grantDescription.split('##').find(part => part.includes('How it works'))?.trim() ||
                           projectDetails.description.split('\n').slice(2, 4).join(' ')
                         : projectDetails.description.split('\n').slice(2, 4).join(' '));
          } else {
            problem = grantDescription
              ? grantDescription.split('##').find(part => part.includes('Why it Matters'))?.trim() ||
                projectDetails.description.split('\n').slice(0, 2).join(' ')
              : projectDetails.description.split('\n').slice(0, 2).join(' ');
            solution = grantDescription
              ? grantDescription.split('##').find(part => part.includes('How it works'))?.trim() ||
                projectDetails.description.split('\n').slice(2, 4).join(' ')
              : projectDetails.description.split('\n').slice(2, 4).join(' ');
          }

          problem = problem || 'No problem description available';
          solution = solution || 'No solution description available';

          return {
            id: project.uid,
            title: projectDetails.title || 'Untitled Project',
            banner: projectDetails.imageURL.startsWith('baf')
              ? `https://ipfs.io/ipfs/${projectDetails.imageURL}`
              : projectDetails.imageURL || '',
            problem: parseMarkdown(problem),
            solution: parseMarkdown(solution),
            videoUrl: projectDetails.links.find((link: any) => link.type === 'youtube')?.url,
            demoUrl: projectDetails.links.find((link: any) => link.type === 'website')?.url ||
                     'https://gap.karmahq.xyz',
            tags: projectDetails.links.map((link: any) => link.type).filter((type: any) => type !== 'website'),
            season: currentSeasonId,
            isGrant: currentSeason.isGrant,
          };
        });

        setAllProjects(mappedProjects);
        setCurrentIndex(0);
        setShowVideo(false);
      } catch (error) {
        console.error('Error fetching projects:', error, { seasonId: currentSeasonId, projects: [] });
        setAllProjects([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [currentSeasonId, seasons]);

  // Memoized computations
  const filteredProjects = useMemo(() =>
    allProjects.filter(project => project.season === currentSeasonId),
    [allProjects, currentSeasonId]
  );

  const currentProject = useMemo(() =>
    filteredProjects[currentIndex],
    [filteredProjects, currentIndex]
  );

  const outOfProjects = currentIndex >= filteredProjects.length;

  const currentSeason = useMemo(() =>
    seasons.find(season => season.id === currentSeasonId),
    [seasons, currentSeasonId]
  );

  const handleSwipe = useCallback((dir: string) => {
    setDirection(dir);
    setSwipeFeedback(dir === 'right' ? 'Liked!' : 'Passed');

    if (dir === 'right' && currentProject) {
      setLikedProjects(prev => {
        if (!prev.some(p => p.id === currentProject.id)) {
          return [...prev, currentProject];
        }
        return prev;
      });
      // sdk.actions.openUrl(`https://gap.karmahq.xyz/projects/${currentProject.id}`);
    }

    setTimeout(() => {
      setCurrentIndex((prevIndex) => prevIndex + 1);
      setDirection(null);
      setSwipeFeedback(null);
    }, 300);
  }, [currentProject]);

  const goToDemo = useCallback(() => {
    if (currentProject?.demoUrl) {
      sdk.actions.openUrl(currentProject.demoUrl);
    }
  }, [currentProject]);

  const toggleVideo = useCallback(() => {
    if (currentProject?.videoUrl) {
      setShowVideo(prev => !prev);
    }
  }, [currentProject]);

  const changeSeason = useCallback((seasonId: string) => {
    setCurrentSeasonId(seasonId);
    setShowSeasonSelector(false);
  }, []);

  const closeOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-64 bg-gray-100 rounded-2xl">
        <div className="space-y-4 w-64">
          <div className="h-4 bg-gray-300 rounded-full animate-pulse"></div>
          <div className="h-4 bg-gray-300 rounded-full animate-pulse w-5/6"></div>
          <div className="h-4 bg-gray-300 rounded-full animate-pulse"></div>
          <div className="h-32 bg-gray-300 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-md mx-auto w-full p-4 sm:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-poppins">
      {/* Onboarding Overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Celo Projects</h2>
            <p className="text-gray-600 mb-6">
              Swipe <span className="text-green-500 font-semibold">right</span> to like a project and endorse it, or swipe{' '}
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

      {/* Season selector */}
      <div className="mb-4 sm:mb-6 relative z-10">
        <button
          onClick={() => setShowSeasonSelector(prev => !prev)}
          className="flex items-center justify-between w-full p-4 bg-white border border-gray-200 rounded-2xl shadow-sm hover:bg-gray-50 transition-all duration-200"
        >
          <div className="flex items-center">
            <div className={`w-2 h-8 rounded-full mr-3 bg-[${celoColors.gold}]`}></div>
            <div>
              <span className="block text-sm font-semibold text-gray-800">{currentSeason?.name || 'Select Program'}</span>
              <span className="block text-xs text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">{currentSeason?.description || 'Choose a program'}</span>
            </div>
          </div>
          <ChevronDown size={18} className={`text-gray-500 transition-transform duration-200 ${showSeasonSelector ? 'rotate-180' : ''}`} />
        </button>

        {showSeasonSelector && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-20 animate-slide-down">
            {seasons.map(season => (
              <button
                key={season.id}
                onClick={() => changeSeason(season.id)}
                className={`flex items-center w-full p-4 hover:bg-gray-50 transition-colors duration-200 ${
                  season.id === currentSeasonId ? 'bg-green-50' : ''
                }`}
              >
                <div className={`w-2 h-8 rounded-full mr-3 ${season.id === currentSeasonId ? `bg-[${celoColors.gold}]` : 'bg-gray-300'}`}></div>
                <div className="text-left">
                  <span className="block text-sm font-semibold text-gray-800">{season.name}</span>
                  <span className="block text-xs text-gray-500 truncate max-w-[200px] sm:max-w-[300px]">{season.description}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full h-[50vh] max-h-[400px] min-h-[300px] overflow-hidden">
        {outOfProjects ? (
          <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-green-50 to-gold-50 rounded-2xl shadow-lg text-center animate-fade-in">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Program Complete!</h2>
            <p className="text-gray-600 mb-6 px-4">You've reviewed all projects in {currentSeason?.name}</p>
            <button
              onClick={() => setCurrentIndex(0)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full font-semibold shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 flex items-center"
            >
              <ArrowLeft size={16} className="mr-2" />
              View Again
            </button>
          </div>
        ) : (
          <div className="relative w-full h-full">
            {/* Swipe feedback overlay */}
            {swipeFeedback && (
              <div className="absolute inset-0 flex items-center justify-center z-10 animate-fade-out">
                <div className={`text-2xl sm:text-3xl font-bold ${swipeFeedback === 'Liked!' ? 'text-green-500' : 'text-red-500'} bg-white/80 px-6 py-3 rounded-full shadow-lg`}>
                  {swipeFeedback}
                </div>
              </div>
            )}
            <TinderCard
              onSwipe={handleSwipe}
              preventSwipe={["up", "down"]}
              key={currentProject?.id || 'empty'}
              className="absolute w-full h-full"
              swipeRequirementType="position"
              swipeThreshold={100}
            >
              <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden bg-white transform transition-all duration-300 hover:scale-105 box-border">
                {/* Card header with image */}
                <div className="relative h-1/2">
                  <img
                    src={currentProject?.banner || celoImageURL}
                    alt={currentProject?.title || 'Project'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                      S{currentProject?.season || ''}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 p-4 w-full">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {currentProject?.tags?.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-green-600/80 text-white text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white truncate">{currentProject?.title || 'Untitled'}</h2>
                  </div>
                  {currentProject?.videoUrl && (
                    <button
                      onClick={toggleVideo}
                      className="absolute top-3 right-3 bg-black/60 p-2 rounded-full hover:bg-black/80 transition-colors duration-200"
                    >
                      <Video size={20} className="text-white" />
                    </button>
                  )}
                </div>

                {/* Card content */}
                <div className="p-4 h-1/2 overflow-y-auto bg-neutral-50">
                  {showVideo && currentProject?.videoUrl ? (
                    <div className="h-full w-full">
                      <iframe
                        src={currentProject.videoUrl}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <>
                      <div className="mb-3">
                        {currentProject?.isGrant ? (
                          <h3 className="text-sm font-semibold text-gray-500">Problem</h3>
                        ) : (
                          <h3 className="text-sm font-semibold text-gray-500">Description</h3>
                        )}
                        <p
                          className="text-gray-800 text-sm"
                          dangerouslySetInnerHTML={{ __html: currentProject?.problem || 'No problem description' }}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-500">Solution</h3>
                        <p
                          className="text-gray-800 text-sm"
                          dangerouslySetInnerHTML={{ __html: currentProject?.solution || 'No solution description' }}
                        />
                      </div>
                      <button
                        onClick={goToDemo}
                        className="flex items-center mt-4 text-green-600 font-semibold text-sm hover:text-green-700 transition-colors duration-200"
                      >
                        View Demo <ExternalLink size={16} className="ml-1" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </TinderCard>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {!outOfProjects && (
        <div className="flex gap-2 justify-center my-4 sm:my-6">
          {filteredProjects.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                idx === currentIndex ? 'bg-green-500 scale-125' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!outOfProjects && (
        <div className="flex justify-center gap-6 sm:gap-8 mt-4">
          <button
            onClick={() => handleSwipe('left')}
            className="p-4 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-red-50 hover:scale-110 transition-all duration-200"
          >
            <X size={24} className="text-red-500" />
          </button>
          <button
            onClick={() => handleSwipe('right')}
            className="p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-lg hover:from-green-600 hover:to-green-700 hover:scale-110 transition-all duration-300"
          >
            <Heart size={24} className="text-white" />
          </button>
        </div>
      )}

      {/* Season stats */}
      <div className="mt-6 sm:mt-8 pt-4 border-t border-gray-200">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{currentSeason?.name} • {filteredProjects.length} projects</span>
          <span>{currentSeason?.startDate} - {currentSeason?.endDate}</span>
        </div>
      </div>
    </div>
  );
}

// CSS for animations (add to your CSS file or global styles)
const styles = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes fade-out {
    from { opacity: 1; }
    to { opacity: 0; }
  }

  @keyframes slide-down {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }

  .animate-fade-out {
    animation: fade-out 0.5s ease-out forwards;
  }

  .animate-slide-down {
    animation: slide-down 0.3s ease-out;
  }
`;