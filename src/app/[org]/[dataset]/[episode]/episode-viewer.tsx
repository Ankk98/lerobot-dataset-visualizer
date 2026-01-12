"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postParentMessageWithParams } from "@/utils/postParentMessage";
import { SimpleVideosPlayer } from "@/components/simple-videos-player";
import DataRecharts from "@/components/data-recharts";
import PlaybackBar from "@/components/playback-bar";
import { TimeProvider, useTime } from "@/context/time-context";
import Sidebar from "@/components/side-nav";
import Loading from "@/components/loading-component";
import { getAdjacentEpisodesVideoInfo } from "./fetch-data";

export default function EpisodeViewer({
  data,
  error,
  org,
  dataset,
}: {
  data?: any;
  error?: string;
  org?: string;
  dataset?: string;
}) {
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-red-400">
        <div className="max-w-xl p-8 rounded bg-slate-900 border border-red-500 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-lg font-mono whitespace-pre-wrap mb-4">{error}</p>
        </div>
      </div>
    );
  }
  return (
    <TimeProvider key={data.episodeId} duration={data.duration}>
      <EpisodeViewerInner data={data} org={org} dataset={dataset} />
    </TimeProvider>
  );
}

function EpisodeViewerInner({ data, org, dataset }: { data: any; org?: string; dataset?: string; }) {
  const {
    datasetInfo,
    episodeId,
    videosInfo,
    chartDataGroups,
    episodes,
    task,
    duration,
  } = data;
  
  // Get fps from dataset info (default to 30 if not available)
  const fps = datasetInfo?.fps || 30;

  const [videosReady, setVideosReady] = useState(!videosInfo.length);
  const [chartsReady, setChartsReady] = useState(false);
  const isLoading = !videosReady || !chartsReady;
  
  // Memoize callbacks to prevent infinite re-renders/re-fetches
  const handleVideosReady = useCallback(() => setVideosReady(true), []);
  const handleChartsReady = useCallback(() => setChartsReady(true), []);

  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  // Use context for time sync
  const { currentTime, setCurrentTime, setIsPlaying, isPlaying } = useTime();
  
  // Refs for keyboard shortcuts
  const toggleSidebarRef = useRef<(() => void) | null>(null);
  const expandVideoRef = useRef<((filename: string | null) => void) | null>(null);
  
  // Keyboard shortcuts help display
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Pagination state
  const pageSize = 100;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(episodes.length / pageSize);
  const paginatedEpisodes = episodes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  
  // Preload adjacent episodes' videos
  useEffect(() => {
    if (!org || !dataset) return;
    
    const preloadAdjacent = async () => {
      try {
        await getAdjacentEpisodesVideoInfo(org, dataset, episodeId, 2);
        // Preload adjacent episodes for smoother navigation
      } catch {
        // Skip preloading on error
      }
    };
    
    preloadAdjacent();
  }, [org, dataset, episodeId]);

  // Initialize based on URL time parameter - only on initial mount
  // Use a ref to track if we've already initialized from URL
  const urlInitializedRef = useRef(false);
  useEffect(() => {
    if (urlInitializedRef.current) return; // Only run once
    
    const timeParam = searchParams.get("t");
    if (timeParam) {
      const timeValue = parseFloat(timeParam);
      if (!isNaN(timeValue)) {
        setCurrentTime(timeValue);
      }
    }
    urlInitializedRef.current = true;
  }, [searchParams, setCurrentTime]);

  // sync with parent window hf.co/spaces
  useEffect(() => {
    postParentMessageWithParams((params: URLSearchParams) => {
      params.set("path", window.location.pathname + window.location.search);
    });
  }, []);

  // Frame jump amount (5 frames in seconds)
  const frameJumpAmount = 5 / fps;

  // Use refs to avoid stale closures in keyboard event handler
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);
  
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);
  
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Initialize page based on current episode
  useEffect(() => {
    const episodeIndex = episodes.indexOf(episodeId);
    if (episodeIndex !== -1) {
      setCurrentPage(Math.floor(episodeIndex / pageSize) + 1);
    }
  }, [episodes, episodeId, pageSize]);

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey } = e;
      const isModifier = ctrlKey || metaKey;

      // Space: Play/Pause
      if (key === " ") {
        e.preventDefault();
        setIsPlaying((prev: boolean) => !prev);
      }
      // ArrowLeft: Jump backward 3 seconds
      else if (key === "ArrowLeft" && !isModifier) {
        e.preventDefault();
        setCurrentTime(Math.max(0, currentTimeRef.current - 3));
      }
      // ArrowRight: Jump forward 3 seconds
      else if (key === "ArrowRight" && !isModifier) {
        e.preventDefault();
        setCurrentTime(Math.min(durationRef.current, currentTimeRef.current + 3));
      }
      // ArrowDown/ArrowUp: Navigate episodes
      else if ((key === "ArrowDown" || key === "ArrowUp") && !isModifier) {
        e.preventDefault();
        const nextEpisodeId = key === "ArrowDown" ? episodeId + 1 : episodeId - 1;
        const lowestEpisodeId = episodes[0];
        const highestEpisodeId = episodes[episodes.length - 1];

        if (
          nextEpisodeId >= lowestEpisodeId &&
          nextEpisodeId <= highestEpisodeId
        ) {
          router.push(`./episode_${nextEpisodeId}`);
        }
      }
      // B: Toggle sidebar
      else if (key === "b" || key === "B") {
        e.preventDefault();
        if (toggleSidebarRef.current) {
          toggleSidebarRef.current();
        }
      }
      // R or Home: Restart playback (go to beginning)
      else if (key === "r" || key === "R" || key === "Home") {
        e.preventDefault();
        setCurrentTime(0);
      }
      // 1: Expand left video
      else if (key === "1") {
        e.preventDefault();
        const leftVideo = videosInfo.find(v => v.filename === "observation.images.left");
        if (leftVideo && expandVideoRef.current) {
          expandVideoRef.current(leftVideo.filename);
        }
      }
      // 2: Expand top video
      else if (key === "2") {
        e.preventDefault();
        const topVideo = videosInfo.find(v => v.filename === "observation.images.top");
        if (topVideo && expandVideoRef.current) {
          expandVideoRef.current(topVideo.filename);
        }
      }
      // 3: Expand right video
      else if (key === "3") {
        e.preventDefault();
        const rightVideo = videosInfo.find(v => v.filename === "observation.images.right");
        if (rightVideo && expandVideoRef.current) {
          expandVideoRef.current(rightVideo.filename);
        }
      }
      // 0 or Escape: Minimize/close expanded video
      else if (key === "0" || key === "Escape") {
        if (expandVideoRef.current) {
          expandVideoRef.current(null);
        }
        // Also close shortcuts help if open
        if (showShortcuts) {
          setShowShortcuts(false);
        }
      }
      // ? or H: Show/hide keyboard shortcuts help
      else if (key === "?" || key === "h" || key === "H") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
      // Shift+ArrowLeft: Jump backward 1 second
      else if (key === "ArrowLeft" && shiftKey) {
        e.preventDefault();
        setCurrentTime(Math.max(0, currentTimeRef.current - 1));
      }
      // Shift+ArrowRight: Jump forward 1 second
      else if (key === "ArrowRight" && shiftKey) {
        e.preventDefault();
        setCurrentTime(Math.min(durationRef.current, currentTimeRef.current + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [setIsPlaying, setCurrentTime, frameJumpAmount, episodeId, episodes, router, videosInfo, showShortcuts]);

  // Only update URL ?t= param when the integer second changes
  const lastUrlSecondRef = useRef<number>(-1);
  useEffect(() => {
    if (isPlaying) return;
    
    const currentSec = Math.floor(currentTime);
    if (currentTime > 0 && lastUrlSecondRef.current !== currentSec) {
      lastUrlSecondRef.current = currentSec;
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.set("t", currentSec.toString());
      // Replace state instead of pushing to avoid navigation stack bloat
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}?${newParams.toString()}`,
      );
      postParentMessageWithParams((params: URLSearchParams) => {
        params.set("path", window.location.pathname + window.location.search);
      });
    }
  }, [isPlaying, currentTime, searchParams]);

  // Pagination functions
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  return (
    <div className="flex h-screen max-h-screen bg-slate-950 text-gray-200">
      {/* Sidebar */}
      <Sidebar
        datasetInfo={datasetInfo}
        paginatedEpisodes={paginatedEpisodes}
        episodeId={episodeId}
        totalPages={totalPages}
        currentPage={currentPage}
        prevPage={prevPage}
        nextPage={nextPage}
        toggleSidebarRef={toggleSidebarRef}
      />

      {/* Content */}
      <div
        className={`flex max-h-screen flex-col gap-4 p-4 md:flex-1 relative ${isLoading ? "overflow-hidden" : "overflow-y-auto"}`}
      >
        {isLoading && <Loading />}

        <div className="flex items-center justify-between my-4">
          <div className="flex items-center justify-start">
            <a
              href="https://github.com/huggingface/lerobot"
                target="_blank"
              className="block"
            >
              <img
                src="https://github.com/huggingface/lerobot/raw/main/media/lerobot-logo-thumbnail.png"
                alt="LeRobot Logo"
                className="w-32"
              />
            </a>

            <div>
              <a
                href={`https://huggingface.co/datasets/${datasetInfo.repoId}`}
                target="_blank"
              >
                <p className="text-lg font-semibold">{datasetInfo.repoId}</p>
              </a>

              <p className="font-mono text-lg font-semibold">
                episode {episodeId}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className="px-3 py-1 text-sm bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 text-slate-300"
            title="Keyboard shortcuts (Press ? or H)"
          >
            ⌨️ Shortcuts
          </button>
        </div>
        
        {/* Keyboard Shortcuts Help */}
        {showShortcuts && (
          <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-600">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-slate-100">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold text-slate-200 mb-2">Playback</p>
                <ul className="space-y-1 text-slate-300">
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Space</kbd> - Play/Pause</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">R</kbd> or <kbd className="px-2 py-1 bg-slate-700 rounded">Home</kbd> - Restart</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">←</kbd> - Back 3 seconds</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">→</kbd> - Forward 3 seconds</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Shift + ←</kbd> - Back 1 second</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">Shift + →</kbd> - Forward 1 second</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-200 mb-2">Navigation</p>
                <ul className="space-y-1 text-slate-300">
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">↑</kbd> - Previous episode</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">↓</kbd> - Next episode</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">B</kbd> - Toggle sidebar</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-200 mb-2">Video Controls</p>
                <ul className="space-y-1 text-slate-300">
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">1</kbd> - Expand left video</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">2</kbd> - Expand top video</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">3</kbd> - Expand right video</li>
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">0</kbd> or <kbd className="px-2 py-1 bg-slate-700 rounded">Esc</kbd> - Minimize video</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-slate-200 mb-2">Help</p>
                <ul className="space-y-1 text-slate-300">
                  <li><kbd className="px-2 py-1 bg-slate-700 rounded">?</kbd> or <kbd className="px-2 py-1 bg-slate-700 rounded">H</kbd> - Show/hide this help</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Videos */}
        {videosInfo.length && (
          <SimpleVideosPlayer
            key={episodeId}
            videosInfo={videosInfo}
            onVideosReady={handleVideosReady}
            expandedVideoRef={expandVideoRef}
          />
        )}

        {/* Language Instruction */}
        {task && (
          <div className="mb-6 p-4 bg-slate-800 rounded-lg border border-slate-600">
            <p className="text-slate-300">
              <span className="font-semibold text-slate-100">Language Instruction:</span>
            </p>
            <div className="mt-2 text-slate-300">
              {task.split('\n').map((instruction, index) => (
                <p key={index} className="mb-1">
                  {instruction}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Graph */}
        <div className="mb-4">
          <DataRecharts
            key={episodeId}
            data={chartDataGroups}
            onChartsReady={handleChartsReady}
          />

        </div>

        <PlaybackBar fps={fps} />
      </div>
    </div>
  );
}
