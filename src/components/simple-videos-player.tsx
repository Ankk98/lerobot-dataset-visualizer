"use client";

import React, { useEffect, useRef, useState } from "react";
import { useTime } from "../context/time-context";
import { FaExpand, FaCompress, FaTimes, FaEye } from "react-icons/fa";

type VideoInfo = {
  filename: string;
  url: string;
  isSegmented?: boolean;
  segmentStart?: number;
  segmentEnd?: number;
  segmentDuration?: number;
};

type VideoPlayerProps = {
  videosInfo: VideoInfo[];
  onVideosReady?: () => void;
};

// Helper to fetch video and create object URL
async function fetchAuthenticatedVideo(url: string): Promise<string> {
  // Check if it's a local file or pre-signed URL
  const isLocal = url.startsWith('/');
  const isPresigned = url.includes('X-Amz-Signature') || url.includes('cas-bridge.xethub.hf.co');
  
  // For local files, just return the URL directly - Next.js will serve it
  if (isLocal) {
    return url;
  }
  
  // Only add auth for remote HuggingFace URLs (not local, not pre-signed)
  const needsAuth = !isLocal && !isPresigned;
  const token = process.env.NEXT_PUBLIC_HF_TOKEN;
  const headers: HeadersInit = (needsAuth && token) ? {
    'Authorization': `Bearer ${token}`
  } : {};

  try {
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('[Video Loading] Error:', error);
    throw error;
  }
}

export const SimpleVideosPlayer = ({
  videosInfo,
  onVideosReady,
}: VideoPlayerProps) => {
  const { currentTime, setCurrentTime, isPlaying, setIsPlaying } = useTime();
  
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [hiddenVideos, setHiddenVideos] = React.useState<string[]>([]);
  const [enlargedVideo, setEnlargedVideo] = React.useState<string | null>(null);
  const [showHiddenMenu, setShowHiddenMenu] = React.useState(false);
  const [videosReady, setVideosReady] = React.useState(false);
  const [videoObjectUrls, setVideoObjectUrls] = useState<Record<string, string>>({});
  const [loadingVideos, setLoadingVideos] = useState(true);
  
  // Track if we're the ones setting the time (to avoid feedback loops)
  const isSeekingRef = useRef(false);
  // Track the last time we synced to avoid unnecessary seeks
  const lastSyncedTimeRef = useRef<number>(-1);
  
  const firstVisibleIdx = videosInfo.findIndex(
    (video) => !hiddenVideos.includes(video.filename)
  );

  // Fetch videos with authentication and create object URLs
  useEffect(() => {
    let isMounted = true;
    const objectUrls: Record<string, string> = {};

    async function loadVideos() {
      try {
        setLoadingVideos(true);
        
        // Fetch all videos in parallel
        const videoPromises = videosInfo.map(async (info) => {
          try {
            const objectUrl = await fetchAuthenticatedVideo(info.url);
            if (isMounted) {
              objectUrls[info.filename] = objectUrl;
            }
            return objectUrl;
          } catch (error) {
            console.error(`Failed to load video ${info.filename}:`, error);
            return null;
          }
        });

        await Promise.all(videoPromises);
        
        if (isMounted) {
          setVideoObjectUrls(objectUrls);
          setLoadingVideos(false);
          // Call onVideosReady immediately after videos are fetched
          // The video elements will handle their own initialization
          if (onVideosReady) {
            // Use a small delay to ensure video elements are rendered
            setTimeout(() => {
              onVideosReady();
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error loading videos:', error);
        if (isMounted) {
          setLoadingVideos(false);
          // Even on error, call onVideosReady to unblock the UI
          if (onVideosReady) {
            setTimeout(() => {
              onVideosReady();
            }, 100);
          }
        }
      }
    }

    loadVideos();

    // Cleanup: revoke object URLs when component unmounts
    return () => {
      isMounted = false;
      Object.values(objectUrls).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [videosInfo, onVideosReady]);

  // Initialize video refs array
  useEffect(() => {
    videoRefs.current = videoRefs.current.slice(0, videosInfo.length);
  }, [videosInfo.length]);

  // Handle videos ready
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        const info = videosInfo[index];
        
        // Setup segment boundaries
        if (info.isSegmented) {
          const handleTimeUpdate = () => {
            const segmentEnd = info.segmentEnd || video.duration;
            const segmentStart = info.segmentStart || 0;
            
            if (video.currentTime >= segmentEnd - 0.05) {
              video.currentTime = segmentStart;
              // Also update the global time to reset to start
              if (index === firstVisibleIdx) {
                setCurrentTime(0);
              }
            }
          };
          
          const handleLoadedData = () => {
            video.currentTime = info.segmentStart || 0;
          };
          
          video.addEventListener('timeupdate', handleTimeUpdate);
          video.addEventListener('loadeddata', handleLoadedData);
          
          // Store cleanup
          (video as any)._segmentHandlers = () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadeddata', handleLoadedData);
          };
        } else {
          // For non-segmented videos, handle end of video
          const handleEnded = () => {
            video.currentTime = 0;
            if (index === firstVisibleIdx) {
              setCurrentTime(0);
            }
          };
          
          video.addEventListener('ended', handleEnded);
          
          // Store cleanup
          (video as any)._segmentHandlers = () => {
            video.removeEventListener('ended', handleEnded);
          };
        }
      }
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video && (video as any)._segmentHandlers) {
          (video as any)._segmentHandlers();
        }
      });
    };
  }, [videosInfo, firstVisibleIdx, setCurrentTime]);

  // Auto-play videos when they become ready
  useEffect(() => {
    if (!loadingVideos && Object.keys(videoObjectUrls).length > 0) {
      setVideosReady(true);
      setIsPlaying(true);
    }
  }, [loadingVideos, videoObjectUrls, setIsPlaying]);

  // Handle play/pause
  useEffect(() => {
    if (!videosReady) return;
    
    videoRefs.current.forEach((video, idx) => {
      if (video && !hiddenVideos.includes(videosInfo[idx].filename)) {
        if (isPlaying) {
          video.play().catch(e => {
            if (e.name !== 'AbortError') {
              console.error('[VideoPlayer] Error playing video:', e);
            }
          });
        } else {
          video.pause();
        }
      }
    });
  }, [isPlaying, videosReady, hiddenVideos, videosInfo]);

  // Sync video times - only seek when there's a significant difference
  // This prevents feedback loops during normal playback
  useEffect(() => {
    if (!videosReady) return;
    
    // Skip if we just synced to this time (prevents loops)
    if (Math.abs(currentTime - lastSyncedTimeRef.current) < 0.01) {
      return;
    }
    
    const firstVideo = videoRefs.current[firstVisibleIdx];
    if (!firstVideo) return;
    
    const info = videosInfo[firstVisibleIdx];
    let targetTime = currentTime;
    if (info?.isSegmented) {
      targetTime = (info.segmentStart || 0) + currentTime;
    }
    
    // Only seek if the difference is significant (more than 0.1 seconds)
    // This allows natural playback without constant seeking
    const currentVideoTime = firstVideo.currentTime;
    const timeDiff = Math.abs(currentVideoTime - targetTime);
    
    if (timeDiff > 0.1) {
      isSeekingRef.current = true;
      lastSyncedTimeRef.current = currentTime;
      
      // Sync all videos
      videoRefs.current.forEach((video, index) => {
        if (video && !hiddenVideos.includes(videosInfo[index].filename)) {
          const vInfo = videosInfo[index];
          let vTargetTime = currentTime;
          if (vInfo?.isSegmented) {
            vTargetTime = (vInfo.segmentStart || 0) + currentTime;
          }
          video.currentTime = vTargetTime;
        }
      });
      
      // Reset seeking flag after a short delay
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 50);
    }
  }, [currentTime, videosInfo, videosReady, hiddenVideos, firstVisibleIdx]);

  // Handle time update from first visible video
  // Only update context when video is playing naturally (not when we're seeking)
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    
    // Don't update context if:
    // 1. Video is paused (scrubbing mode - slider is source of truth)
    // 2. Video is seeking (browser is processing a seek)
    // 3. We just performed a programmatic seek (prevents feedback loop)
    if (video.paused || video.seeking || isSeekingRef.current) {
      return;
    }
    
    const videoIndex = videoRefs.current.findIndex(ref => ref === video);
    const info = videosInfo[videoIndex];
    
    if (info) {
      let globalTime = video.currentTime;
      if (info.isSegmented) {
        globalTime = video.currentTime - (info.segmentStart || 0);
      }
      
      // Update the last synced time to prevent the sync effect from seeking back
      lastSyncedTimeRef.current = globalTime;
      setCurrentTime(globalTime);
    }
  };

  // Handle play click for segmented videos
  const handlePlay = (video: HTMLVideoElement, info: VideoInfo) => {
    if (info.isSegmented) {
      const segmentStart = info.segmentStart || 0;
      const segmentEnd = info.segmentEnd || video.duration;
      
      if (video.currentTime < segmentStart || video.currentTime >= segmentEnd) {
        video.currentTime = segmentStart;
      }
    }
    video.play();
  };

  // Show loading state while videos are being fetched
  if (loadingVideos || Object.keys(videoObjectUrls).length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
        {videosInfo.map((info) => (
          <div key={info.filename} className="w-full">
            <p className="truncate w-full rounded-t-xl bg-gray-800 px-2 text-sm text-gray-300">
              {info.filename}
            </p>
            <div className="w-full h-64 bg-slate-900 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-slate-400">Loading video...</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Hidden videos menu */}
      {hiddenVideos.length > 0 && (
        <div className="relative mb-4">
          <button
            className="flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700 border border-slate-500"
            onClick={() => setShowHiddenMenu(!showHiddenMenu)}
          >
            <FaEye /> Show Hidden Videos ({hiddenVideos.length})
          </button>
          {showHiddenMenu && (
            <div className="absolute left-0 mt-2 w-max rounded border border-slate-500 bg-slate-900 shadow-lg p-2 z-50">
              <div className="mb-2 text-xs text-slate-300">
                Restore hidden videos:
              </div>
              {hiddenVideos.map((filename) => (
                <button
                  key={filename}
                  className="block w-full text-left px-2 py-1 rounded hover:bg-slate-700 text-slate-100"
                  onClick={() => setHiddenVideos(prev => prev.filter(v => v !== filename))}
                >
                  {filename}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Videos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-6">
        {videosInfo.map((info, idx) => {
          if (hiddenVideos.includes(info.filename)) return null;
          
          const isEnlarged = enlargedVideo === info.filename;
          const isFirstVisible = idx === firstVisibleIdx;
          const videoSrc = videoObjectUrls[info.filename];
          
          if (!videoSrc) return null; // Skip if video hasn't loaded yet
          
          return (
            <div
              key={info.filename}
              className={`${
                isEnlarged
                  ? "z-40 fixed inset-0 bg-black bg-opacity-90 flex flex-col items-center justify-center"
                  : "w-full"
              }`}
            >
              <p className="truncate w-full rounded-t-xl bg-gray-800 px-2 text-sm text-gray-300 flex items-center justify-between">
                <span>{info.filename}</span>
                <span className="flex gap-1">
                  <button
                    title={isEnlarged ? "Minimize" : "Enlarge"}
                    className="ml-2 p-1 hover:bg-slate-700 rounded"
                    onClick={() => setEnlargedVideo(isEnlarged ? null : info.filename)}
                  >
                    {isEnlarged ? <FaCompress /> : <FaExpand />}
                  </button>
                  <button
                    title="Hide Video"
                    className="ml-1 p-1 hover:bg-slate-700 rounded"
                    onClick={() => setHiddenVideos(prev => [...prev, info.filename])}
                    disabled={videosInfo.filter(v => !hiddenVideos.includes(v.filename)).length === 1}
                  >
                    <FaTimes />
                  </button>
                </span>
              </p>
              <video
                ref={el => videoRefs.current[idx] = el}
                className={`w-full object-contain ${
                  isEnlarged ? "max-h-[90vh] max-w-[90vw]" : ""
                }`}
                muted
                preload="auto"
                onPlay={(e) => handlePlay(e.currentTarget, info)}
                onTimeUpdate={isFirstVisible ? handleTimeUpdate : undefined}
                src={videoSrc}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default SimpleVideosPlayer;
