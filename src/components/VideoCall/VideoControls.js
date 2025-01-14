/* eslint-disable */
import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Fab,
  styled,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Snackbar,
} from '@mui/material';
import { Check, HdOutlined } from '@mui/icons-material';

import CallEndIcon from '@mui/icons-material/CallEnd';
import { useTranslation } from 'react-i18next';
import { setLocalTranslationLanguage } from '../../redux/translationSlice';
import { setCallMenuOpen, setCallSideMenu } from '../../redux/uiSlice';
import SideMenu from './SideMenu';
import { ReactComponent as CurvedMenuBackground } from './assets/curved_menu.svg';
import { ReactComponent as CaptionIcon } from './assets/caption_icon.svg';
import SummarizeOutlinedIcon from '@mui/icons-material/SummarizeOutlined';
import { ReactComponent as TranslationIcon } from './assets/translation_icon.svg';
import { useSocket } from '../context/SocketContext';
import { getCountriesList } from '../utils/countriesConfig';
import TranslationDisplay from './TranslationDisplay';

const CustomBottomNavigationAction = styled(BottomNavigationAction)({
  color: 'white',
  minWidth: '60px',
  padding: 0,
  flexGrow: 0,
  margin: '0 20px',
  // fontSize: '36 px',
  '&.Mui-selected': {
    backgroundColor: 'white',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    transition: 'all 0.3s ease',
    '& svg': {
      fill: '#008080',
    },
  },
  '&:hover': {
    backgroundColor: 'white',
    borderRadius: '50%',
    width: '60px',
    height: '60px',
    transition: 'all 0.3s ease',
    '& svg': {
      fill: '#008080',
      color: '#4abbc9',
    },
  },
});

const VideoControls = ({ callStarted, onCallToggle, onEnableHD }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [timeInSeconds, setTimeInSeconds] = useState(15 * 60);
  const [isMeetingEndingSoon, setIsMeetingEndingSoon] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [openSnackbarMeetingNotes, setOpenSnackbarMeetingNotes] =
    useState(false);
  const [isMeetingNotes, setIsMeetingNotes] = useState(true);
  const [isHdSelected, setIsHdSelected] = useState(false);
  const isMainMenuOpen = useSelector((state) => state.ui.callMenuOpen);
  const isSideMenuOpen = useSelector((state) => state.ui.callSideMenu);
  const userTranslationLanguage =
    useSelector((state) => state.translation.localTranslationLanguage) ||
    localStorage.getItem('translationLanguagePreference') ||
    'en';
  const userUid = useSelector((state) => state.user.uid);
  const meetingId = useSelector((state) => state.meeting.meetingId);

  const { t } = useTranslation();
  const { socket } = useSocket();

  const translationTextBoxRef = useRef(null);

  // Function to format the time as HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  useEffect(() => {
    let timerInterval = null;
    if (callStarted) {
      timerInterval = setInterval(() => {
        setTimeInSeconds((prevTime) => {
          if (prevTime <= 0) {
            clearInterval(timerInterval);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    // Cleanup the interval when the component unmounts or connectionState changes
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [callStarted]);

  useEffect(() => {
    const handleMeetingEndingSoon = ({ message }) => {
      if (message === 'meetingEndingSoon') {
        setIsMeetingEndingSoon(true);
      }
    };
    if (socket) {
      socket.on('meetingWarning', handleMeetingEndingSoon);
    }

    return () => {
      if (socket) {
        socket.off('meetingWarning', handleMeetingEndingSoon);
      }
    };
  }, [socket]);

  const dispatch = useDispatch();
  const drawerContainerRef = useRef(null);

  const handleLanguageChange = (lang) => {
    handleClose();
    dispatch(setLocalTranslationLanguage(lang));
    localStorage.setItem('translationLanguagePreference', lang);
    socket.emit('updateLanguages', { uid: userUid, translationLanguage: lang });
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  const handleCloseSnackbarMeetingNotes = () => {
    setOpenSnackbarMeetingNotes(false);
  };

  return (
    <div className="video-chat-controls" ref={drawerContainerRef}>
      <SideMenu />
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        sx={{
          fontSize: '12px',
        }}
      >
        <MenuItem
          disabled
          key="title_side_menu"
          sx={{
            '&.Mui-disabled': {
              opacity: 1,
              padding: 0,
              fontSize: 14,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              color: '#4abbc9',
              padding: '3px 10px 5px 10px',
              borderBottom: '1px solid #d9d9d9',
              fontWeight: 500,
            }}
          >
            {t('Select Language ')}
          </Typography>
        </MenuItem>
        {getCountriesList().map((lang) => (
          <MenuItem
            key={lang.languageCode}
            value={lang.languageCode}
            onClick={() => handleLanguageChange(lang.languageCode)}
            sx={{
              fontSize: '12px',
              color:
                userTranslationLanguage === lang.languageCode
                  ? '#4abbc9'
                  : '#AFAFAF',
            }}
          >
            <Avatar
              sx={{
                bgcolor: '#4abbc9',
                color: '#fff',
                height: lang.languageCode === 'zh' ? 18 : 20,
                width: lang.languageCode === 'zh' ? 18 : 20,
                marginRight: 3,
              }}
            >
              {lang.avatar}
            </Avatar>
            {t(lang.name)}
            {userTranslationLanguage === lang.languageCode && (
              <Check
                sx={{
                  height: '20px',
                  width: '18px',
                  marginLeft: '10px',
                }}
              />
            )}
          </MenuItem>
        ))}
      </Menu>
      {callStarted && (
        <Box
          display="flex"
          alignItems="center"
          bgcolor="rgb(116 110 110 / 78%)"
          color="white"
          borderRadius="50px"
          padding="5px 10px"
          bottom={isMainMenuOpen ? '240px' : '140px'}
          left="10px"
          position="absolute"
          border="1px solid #FF7722"
          sx={{
            animation: isMainMenuOpen
              ? 'moveUpTimer 0.5s ease-in-out forwards'
              : 'moveDownTimer 0.5s ease-in-out forwards',
          }}
        >
          <Typography variant="body1" style={{ marginLeft: '8px' }}>
            {isMeetingEndingSoon
              ? 'Meeting will end soon'
              : formatTime(timeInSeconds)}
          </Typography>
        </Box>
      )}

      <TranslationDisplay
        isMainMenuOpen={isMainMenuOpen}
        userTranslationLanguage={userTranslationLanguage}
        translationTextBoxRef={translationTextBoxRef}
        translationLanguage={userTranslationLanguage}
      />

      <Box
        sx={{
          position: 'absolute',
          top: '-44px' /* Adjust depending on the size of the circle */,
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          width: '66px',
          height: '66px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Fab
          aria-label="end call"
          sx={{
            position: 'absolute',
            top: '0px',
            boxShadow: '0px 3px 10px rgba(0, 0, 0, 0.2)',
            width: '66px',
            height: '66px',
            backgroundColor: '#DF4303',
            color: '#fff',
          }}
          onClick={() => onCallToggle()}
        >
          <CallEndIcon />
        </Fab>
      </Box>

      <Box
        sx={{
          // backgroundColor: '#4abbc9',
          // color: 'white',
          // fontSize: '25px',
          // WebkitMaskImage:
          //   'radial-gradient(circle at top, transparent 40px, black 41px)',
          // width: '100%',
          // height: '92px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%', // Ensure the container takes full width
          height: '95px', // Set the desired height
          overflow: 'hidden',
        }}
      >
        <BottomNavigation
          showLabels
          sx={{
            backgroundColor: 'transparent',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            height: '100%',
            top: '7px',
            position: 'absolute',
            zIndex: 1,
            width: '100%',
            justifyContent: 'space-around',
          }}
        >
          <CustomBottomNavigationAction
            icon={<CaptionIcon sx={{ fontSize: 36 }} />}
            onClick={() => {
              dispatch(setCallMenuOpen(!isMainMenuOpen));

              if (isSideMenuOpen) {
                dispatch(setCallSideMenu(false));
              }
            }}
          />

          <CustomBottomNavigationAction
            icon={<TranslationIcon sx={{ fontSize: 36 }} />}
            onClick={(event) => setAnchorEl(event.currentTarget)}
          />

          <CustomBottomNavigationAction
            icon={
              <SummarizeOutlinedIcon
                sx={{
                  fontSize: 36,
                  marginLeft: 3,
                  color: isMeetingNotes ? 'orange' : 'white',
                }}
              />
            }
            sx={{ color: 'white' }}
            onClick={() => {
              setIsMeetingNotes((isMeetingNotes) => {
                socket.emit('setTranscriptPreference', {
                  meetingId,
                  preference: !isMeetingNotes,
                });

                return !isMeetingNotes;
              });

              setOpenSnackbarMeetingNotes(true);
            }}
          />

          <CustomBottomNavigationAction
            icon={
              <HdOutlined
                sx={{ fontSize: 36, color: isHdSelected ? 'orange' : 'white' }}
              />
            }
            onClick={() => {
              setIsHdSelected((prev) => !prev);
              onEnableHD(isHdSelected);
            }}
          />
          <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={openSnackbar}
            onClose={handleCloseSnackbar}
            message="Feature available early 2025"
            key={'bottom' + 'center Settings'}
            autoHideDuration={500}
          />

          <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            open={openSnackbarMeetingNotes}
            onClose={handleCloseSnackbarMeetingNotes}
            message={`Meeting notes ${isMeetingNotes ? 'enabled' : 'disabled'}`}
            key={'bottom' + 'center Meeting Notes'}
            autoHideDuration={500}
          />
        </BottomNavigation>
        <CurvedMenuBackground
          style={{
            position: 'relative',
            bottom: 0,
            left: 0,
            preserveAspectRatio: 'none',
            width: '100%', // Full width
            height: '100%', // Adjust the height to match your design
          }}
        />
      </Box>
    </div>

    // </div>
  );
};

export default VideoControls;
