import React from "react";
import { useTime } from "../context/time-context";
import {
  FaPlay,
  FaPause,
  FaBackward,
  FaForward,
  FaUndoAlt,
  FaArrowDown,
  FaArrowUp,
  FaArrowLeft,
  FaArrowRight,
} from "react-icons/fa";

type PlaybackBarProps = {
  fps?: number;
};

const PlaybackBar: React.FC<PlaybackBarProps> = ({ fps = 30 }) => {
  const { duration, isPlaying, setIsPlaying, currentTime, setCurrentTime } =
    useTime();

  const sliderActiveRef = React.useRef(false);
  const wasPlayingRef = React.useRef(false);
  const [sliderValue, setSliderValue] = React.useState(currentTime);

  // Calculate frame duration in seconds
  const frameDuration = 1 / fps;
  const frameJumpAmount = 5 * frameDuration; // 5 frames in seconds

  // Only update sliderValue from context if not dragging
  React.useEffect(() => {
    if (!sliderActiveRef.current) {
      setSliderValue(currentTime);
    }
  }, [currentTime]);

  // Update time immediately without debounce (like the graph does)
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    setSliderValue(t);
    setCurrentTime(t);
  };

  const handleSliderMouseDown = () => {
    sliderActiveRef.current = true;
    wasPlayingRef.current = isPlaying;
    // Pause during scrubbing to prevent the video from advancing while we're seeking
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const handleSliderMouseUp = () => {
    sliderActiveRef.current = false;
    setCurrentTime(sliderValue); // Ensure final value is set
    // Restore the playing state from before scrubbing
    if (wasPlayingRef.current) {
      setIsPlaying(true);
    }
  };

  return (
    <div className="flex items-center gap-4 w-full max-w-4xl mx-auto sticky bottom-0 bg-slate-900/95 px-4 py-3 rounded-3xl mt-auto">
      <button
        title="Jump backward 5 frames (←)"
        onClick={() => setCurrentTime(Math.max(0, currentTime - frameJumpAmount))}
        className="text-2xl hidden md:block hover:text-orange-400 transition-colors"
      >
        <FaBackward size={24} />
      </button>
      <button
        className={`text-3xl transition-transform ${isPlaying ? "scale-90 opacity-60" : "scale-110"}`}
        title="Play. Toggle with Space"
        onClick={() => setIsPlaying(true)}
        style={{ display: isPlaying ? "none" : "inline-block" }}
      >
        <FaPlay size={24} />
      </button>
      <button
        className={`text-3xl transition-transform ${!isPlaying ? "scale-90 opacity-60" : "scale-110"}`}
        title="Pause. Toggle with Space"
        onClick={() => setIsPlaying(false)}
        style={{ display: !isPlaying ? "none" : "inline-block" }}
      >
        <FaPause size={24} />
      </button>
      <button
        title="Jump forward 5 frames (→)"
        onClick={() => setCurrentTime(Math.min(duration, currentTime + frameJumpAmount))}
        className="text-2xl hidden md:block hover:text-orange-400 transition-colors"
      >
        <FaForward size={24} />
      </button>
      <button
        title="Rewind from start"
        onClick={() => setCurrentTime(0)}
        className="text-2xl hidden md:block hover:text-orange-400 transition-colors"
      >
        <FaUndoAlt size={24} />
      </button>
      <input
        type="range"
        min={0}
        max={duration || 100}
        step={frameDuration || 0.033}
        value={sliderValue}
        onChange={handleSliderChange}
        onInput={handleSliderChange}
        onMouseDown={handleSliderMouseDown}
        onMouseUp={handleSliderMouseUp}
        onTouchStart={handleSliderMouseDown}
        onTouchEnd={handleSliderMouseUp}
        className="flex-1 mx-2 accent-orange-500 focus:outline-none focus:ring-0 cursor-pointer"
        aria-label="Seek video"
        style={{ pointerEvents: 'auto' }}
      />
      <span className="w-20 text-right tabular-nums text-xs text-slate-200 shrink-0">
        {sliderValue.toFixed(2)}s / {duration.toFixed(1)}s
      </span>

      <div className="text-xs text-slate-300 select-none ml-8 flex-col gap-y-0.5 hidden md:flex">
        <p>
          <span className="inline-flex items-center gap-1 font-mono align-middle">
            <span className="px-2 py-0.5 rounded border border-slate-400 bg-slate-800 text-slate-200 text-xs shadow-inner">
              Space
            </span>
          </span>{" "}
          to pause/unpause
        </p>
        <p>
          <span className="inline-flex items-center gap-1 font-mono align-middle">
            <FaArrowLeft size={14} />/<FaArrowRight size={14} />
          </span>{" "}
          jump 5 frames
        </p>
        <p>
          <span className="inline-flex items-center gap-1 font-mono align-middle">
            <FaArrowUp size={14} />/<FaArrowDown size={14} />
          </span>{" "}
          previous/next episode
        </p>
      </div>
    </div>
  );
};

export default PlaybackBar;
