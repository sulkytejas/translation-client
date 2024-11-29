import { useEffect, useRef, useState } from 'react';
import { Box, Alert, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../onBoarding/LoadingSpinner';
import useListTracker from '../hooks/useListTracker';
import ListOverlay from './ListOverlay';
import useStudioLight from '../hooks/useStudioLight';

import { trackFace } from '../utils/tensorFlowUtils';
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
}) => {
  console.log('connectionState check before call', connectionState);

  const isMainMenuOpen = useSelector((state) => state.ui.callMenuOpen);
  const localTranslationLanguage = useSelector(
    (state) => state.translation.localTranslationLanguage,
  );

  const { listItems, showList, title } = useListTracker();
  const { t } = useTranslation();
  // Check if the srcObject is available or not

  const showConnectionAlert = connectionState !== 'connected';
  const otherParticipantInfo = useSelector(
    (state) => state.meeting.participantInfo,
  );
  const animationFrameRef = useRef(null);
  const stopTrackRef = useRef(null);
  const pipVideoRef = useRef(null);
  const faceTrackingRef = useRef({
    isTracking: false,
    currentStreamId: null,
    stopTrack: null,
  });
  const [showAlert, setShowAlert] = useState(false);

  const { applyStudioLight } = useStudioLight(remoteVideoRef, !callStarted);

  console.log('otherParticipantInfo', otherParticipantInfo);

  const stopFaceTracking = async () => {
    if (faceTrackingRef.current.stopTrack) {
      await faceTrackingRef.current.stopTrack();
      faceTrackingRef.current = {
        isTracking: false,
        currentStreamId: null,
        stopTrack: null,
      };
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleFaceTracking = async (stream, videoRef) => {
    if (
      !stream?.getVideoTracks?.()?.length ||
      !videoRef?.current ||
      !videoContainerRef?.current
    ) {
      return;
    }

    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const streamId = videoTrack.id;

    console.log('Stream settings:', {
      width: settings.width,
      height: settings.height,
      containerWidth: videoContainerRef.current?.clientWidth,
    });

    if (
      !settings?.width ||
      settings.width < videoContainerRef.current.clientWidth
    ) {
      return;
    }

    try {
      // Stop existing face tracking if any
      // if (stopTrackRef.current) {
      //   stopTrackRef.current();
      //   stopTrackRef.current = null;
      // }
      console.log(remoteVideoRef.current, 'remoteVideoRef');
      await stopFaceTracking();

      let remoteStreamInfo = null;
      if (otherParticipantInfo) {
        const values = Object.values(otherParticipantInfo)[0];
        console.log('otherParticipantInfo values', values);

        const { isIOS, userAgent, isLocalDevice, sourceIsIOS } = values;

        remoteStreamInfo = {
          isIOS,
          userAgent,
          isLocalDevice,
          sourceIsIOS,
        };
      }

      const { stopTrack } = await trackFace(
        videoRef.current,
        videoContainerRef.current,
        stream,
        animationFrameRef,
        remoteStreamInfo,
        applyStudioLight,
      );

      // Update tracking state
      faceTrackingRef.current = {
        isTracking: true,
        currentStreamId: streamId,
        stopTrack,
      };
    } catch (error) {
      console.error('Error in face tracking:', error);

      faceTrackingRef.current = {
        isTracking: false,
        currentStreamId: null,
        stopTrack: null,
      };
    }
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopFaceTracking();
    };
  }, []);

  useEffect(() => {
    // if (localStream && remoteTrack) {
    //   console.log(
    //     ' local stream settings',
    //     localStream.getVideoTracks()[0].getSettings().width,
    //     localStream.getVideoTracks()[0].getSettings().height,
    //     'remostream settings',
    //     remoteTrack.getVideoTracks()[0].getSettings().width,
    //     remoteTrack.getVideoTracks()[0].getSettings().height,
    //   );
    // }

    if (!remoteTrack && animationFrameRef.current && stopTrackRef.current) {
      stopTrackRef.current();
    }
  }, [remoteTrack, animationFrameRef, stopTrackRef]);

  // Effect to handle stream switching
  useEffect(() => {
    const currentStream = callStarted ? remoteTrack : localStream;

    // Stop face tracking before switching streams
    stopFaceTracking();

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = currentStream;
    } else {
      setShowAlert(true);
    }

    // Handle PiP video stream
    if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = callStarted ? localStream : null;
    }
  }, [callStarted, localStream, remoteTrack]);

  useEffect(() => {
    console.log('Stream status:', {
      callStarted,
      hasLocalStream: !!localStream,
      localAudioTracks: localStream?.getAudioTracks().map((t) => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
      })),
      hasRemoteStream: !!remoteTrack,
      remoteAudioTracks: remoteTrack?.getAudioTracks().map((t) => ({
        kind: t.kind,
        enabled: t.enabled,
        muted: t.muted,
        readyState: t.readyState,
      })),
    });

    if (remoteVideoRef.current) {
      const stream = callStarted ? remoteTrack : localStream;
      remoteVideoRef.current.srcObject = stream;

      // Chrome sometimes needs a push to play audio
      if (callStarted && stream?.getAudioTracks().length > 0) {
        remoteVideoRef.current
          .play()
          .catch((e) => console.error('Error playing audio:', e));
      }
    }

    if (pipVideoRef.current) {
      pipVideoRef.current.srcObject = callStarted ? localStream : null;
    }

    // Only enhance container when showing local stream
    enhanceVideoContainer(videoContainerRef, !callStarted);

    // Studio light is handled by the hook
  }, [callStarted, localStream, remoteTrack]);

  // Effect to handle remote track changes
  useEffect(() => {
    if (!remoteTrack && faceTrackingRef.current.isTracking) {
      stopFaceTracking();
    }
  }, [remoteTrack]);

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

  return (
    <div className="video-player" style={containerStyle}>
      <Box sx={videoWrapperStyle}>
        <video
          className="local-video"
          ref={remoteVideoRef}
          autoPlay
          playsInline
          // muted={!callStarted}
          onLoadedMetadata={() => {
            const currentStream = !callStarted ? remoteTrack : localStream;
            handleFaceTracking(currentStream, remoteVideoRef);
          }}
          style={{ width: '100%', height: '100%' }}
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
    </div>
  );
};

export default VideoPlayer;
