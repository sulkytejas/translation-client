// Disable es in this file
/* eslint-disable */
import { useEffect, useRef, useState } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../onBoarding/LoadingSpinner';
import useListTracker from '../hooks/useListTracker';
import ListOverlay from './ListOverlay';
import useStudioLight from '../hooks/useStudioLight';
import useStreamAttachment from '../hooks/useStreamAttachment';
import useFaceTracking from '../hooks/useFaceTracking';

import { enhanceVideoContainer } from '../utils/videoPlayerUtils';

const circularRemoteVideo = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  backgroundColor: '#DF4303',
  borderRadius: '50px',
  padding: ' 4px',
  width: '60pxpx',
  height: '100px',
  boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.2)',
  border: '1px solid #fff',
  transition: 'all 0.5s ease-in-out',
};

const circularRemoteVideoInner = {
  width: '55px',
  height: '55px',
  borderRadius: '50%',
  overflow: 'hidden',
  marginBottom: '10px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const mainRemoteVideo = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100px',
  height: '140px',
  boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.2)',
};

const mainRemoteVideoInner = {
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  transition: 'all 0.5s ease-in-out',
};

// const containerStyle = {
//   position: 'relative',
//   width: '100%',
//   height: '100%',
//   backgroundColor: '#000', // Black letterboxing
// };

const VideoPlayer = ({
  localStream,
  remoteVideoRef,
  connectionState,
  remoteTrack,
  videoContainerRef,
  callStarted,
  onNoMediaFlow,
}) => {
  const isMainMenuOpen = useSelector((state) => state.ui.callMenuOpen);
  const localTranslationLanguage = useSelector(
    (state) => state.translation.localTranslationLanguage,
  );
  const otherParticipantInfo = useSelector(
    (state) => state.meeting.participantInfo,
  );

  const { listItems, showList, title } = useListTracker();
  const { t } = useTranslation();

  // Check if the srcObject is available or not

  const showConnectionAlert = connectionState !== 'connected';

  const pipVideoRef = useRef(null);

  const [showAlert, setShowAlert] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const [hasMediaFlow, setHasMediaFlow] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const maxAttempts = 5;
  const baseDelay = 1000; // 1s between checks
  const attemptRef = useRef(0);

  const { applyStudioLight } = useStudioLight(remoteVideoRef, !callStarted);

  const handlePiPError = (error) => {
    if (error.name === 'AbortError') {
      // Just log AbortErrors as they're expected during switches
      console.log('PiP stream switch in progress');
    } else {
      console.warn('PiP playback error:', error);
      // Only show error for non-abort errors
      setStreamError(error);
    }
  };

  // Add stream attachment hooks
  useStreamAttachment(
    remoteVideoRef,
    callStarted ? remoteTrack : localStream,
    setStreamError,
  );
  useStreamAttachment(
    pipVideoRef,
    callStarted ? localStream : null,
    handlePiPError,
  );

  useEffect(() => {
    // Reset opacity when stream changes
    setOpacity(0);
  }, [localStream, remoteTrack]);

  const { startFaceTracking, stopFaceTracking } = useFaceTracking({
    stream: callStarted ? remoteTrack : localStream,
    videoRef: remoteVideoRef,
    videoContainerRef,
    otherParticipantInfo,
    applyStudioLight,
    enabled: true,
  });

  // Handle stream switching with face tracking
  useEffect(() => {
    const handleSwitchStreams = async () => {
      await stopFaceTracking();

      // Ensure a small delay between switches
      await new Promise((r) => setTimeout(r, 100));

      if (remoteVideoRef.current) {
        // Don't need to manually set srcObject here as useStreamAttachment handles it
        try {
          // await startFaceTracking();
        } catch (error) {
          console.warn('Face tracking failed:', error);
        }
      } else {
        setShowAlert(true);
      }

      if (pipVideoRef.current && callStarted) {
        // Let useStreamAttachment handle PiP video too
        try {
          await new Promise((r) => setTimeout(r, 100)); // Small delay after main video
        } catch (error) {
          console.warn('PiP setup failed:', error);
        }
      }

      enhanceVideoContainer(videoContainerRef, !callStarted);
    };

    handleSwitchStreams();
  }, [callStarted, localStream, remoteTrack]);

  const videoWrapperStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // Add subtle shadow only when showing local stream
    // boxShadow: !isCallStarted ? 'inset 0 0 50px rgba(0,0,0,0.5)' : 'none',
  };

  const containerStyle = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  };

  console.log('VideoCall stream state:', {
    hasLocalStream: !!localStream,
    localTracks: localStream
      ?.getTracks()
      .map((t) => ({ kind: t.kind, enabled: t.enabled })),
    hasRemoteStream: !!remoteTrack,
    remoteTracks: remoteTrack
      ?.getTracks()
      .map((t) => ({ kind: t.kind, enabled: t.enabled })),
    connectionState,
    callStarted,
  });

  let canceled = false;
  const checkVideoLoaded = async () => {
    if (!remoteVideoRef.current || canceled) {
      console.log('No remote track');
      return;
    }

    const video = remoteVideoRef.current;

    console.log(
      'Media flow detected:',
      remoteTrack,
      video,
      video.videoWidth,
      video.videoHeight,
    );
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      console.log('Media flow detected:', video.videoWidth, video.videoHeight);
      setHasMediaFlow(true);
      return;
    }

    if (attemptRef.current < maxAttempts) {
      attemptRef.current++;
      console.log(
        `Attempt ${attemptRef.current}/${maxAttempts} - no media yet, attempting reconnect...`,
      );

      try {
        await onNoMediaFlow();
        // After attempting reconnect, wait a bit, then check again
      } catch (err) {
        console.error('Reconnect attempt failed:', err);
        // Even if reconnect fails, we can still retry after delay
      }

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        console.log(
          'Media flow detected:',
          video.videoWidth,
          video.videoHeight,
        );
        setHasMediaFlow(true);
        return;
      }

      setTimeout(() => {
        if (!canceled) {
          checkVideoLoaded();
        }
      }, baseDelay * attemptRef.current);
    } else {
      console.error(
        'No media flow detected after max attempts and reconnect attempts.',
      );
    }
  };

  console.log(hasMediaFlow, checkVideoLoaded);

  return (
    <div className="video-player" style={containerStyle}>
      <Box sx={videoWrapperStyle}>
        <video
          className="local-video"
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          // muted={!callStarted}
          onLoadedMetadata={async () => {
            const currentStream = callStarted ? remoteTrack : localStream;
            setOpacity(1);
            // if (currentStream) {
            //   await startFaceTracking();
            // }

            // await checkVideoLoaded();
          }}
          style={{
            width: '100%',
            height: '100%',
            opacity: opacity,
            transition: 'opacity 0.5s ease-in-out',
            objectFit: 'cover',
          }}
        />
      </Box>

      {showList && (
        <ListOverlay listItems={listItems} showList={showList} title={title} />
      )}

      <div className="remote-video">
        <Box sx={isMainMenuOpen ? circularRemoteVideo : mainRemoteVideo}>
          {/* Circular Video */}
          <Box
            sx={
              isMainMenuOpen ? circularRemoteVideoInner : mainRemoteVideoInner
            }
          >
            <video
              ref={pipVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </Box>

          {/* Language Label */}
          {isMainMenuOpen && (
            <Box
              sx={{
                backgroundColor: 'white',
                borderRadius: '20px',
                padding: '2px 10px',
                textAlign: 'center',
                marginTop: '4px',
              }}
            >
              <Typography
                variant="body2"
                sx={{ color: '#4EC7CF', fontWeight: 'bold', fontSize: '9px' }}
              >
                {`• ${localTranslationLanguage || t('not set')}`}
              </Typography>
            </Box>
          )}
        </Box>
      </div>

      {showAlert && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Optional dark overlay
          }}
        >
          <Alert severity="info">
            {t('Waiting for the participant to join...')}
          </Alert>
        </Box>
      )}

      {showConnectionAlert && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)', // Optional dark overlay
          }}
        >
          <Box sx={{ marginBottom: '20px', display: 'inline-block' }}>
            <LoadingSpinner />
            <Box
              component="span"
              sx={{
                color: 'white',
                position: 'absolute',
                top: '58%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              {t('Attempting to reconnect...')}
            </Box>
          </Box>
        </Box>
      )}

      {streamError && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <Alert severity="error">{t('Video stream error occurred')}</Alert>
        </Box>
      )}
    </div>
  );
};

export default VideoPlayer;
