import React, { useEffect, useRef, useMemo } from 'react';
import Hls from 'hls.js';

const VideoPlayer = ({ src, className }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    let hls;

    if (src.endsWith('.m3u8')) {
        if (Hls.isSupported()) {
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });
            hls.loadSource(src);
            hls.attachMedia(videoRef.current);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                videoRef.current.play().catch(e => console.error("Playback failed", e));
            });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // Safari native support
            videoRef.current.src = src;
            videoRef.current.addEventListener('loadedmetadata', () => {
                videoRef.current.play();
            });
        }
    } else {
        videoRef.current.src = src;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <div className={`relative w-full h-[80vh] overflow-hidden ${className}`}>
        <video
            ref={videoRef}
            className="absolute top-0 left-0 w-full h-full object-cover"
            muted
            loop
            autoPlay
            playsInline
        />
    </div>
  );
};

export default React.memo(VideoPlayer);
