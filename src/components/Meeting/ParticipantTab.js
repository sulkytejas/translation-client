import React, { useEffect, useState } from 'react';
import {
  TextField,
  Button,
  InputAdornment,
  Box,
  IconButton,
  FormHelperText,
  Typography,
  Tooltip,
  Snackbar,
  CircularProgress,
  Alert,
} from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LinkIcon from '@mui/icons-material/Link';
import {
  Add as AddIcon,
  Videocam,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';
import { styled } from '@mui/system';
// import { useWebRTC } from '../context/WebrtcContext';
import { useWebRTC } from '../context/WebrtcBridge';
import { useSocket } from '../context/SocketContext';
import {
  joinMeeting,
  setHostSocketId,
  setIsHost,
  setMeetingPhrase,
} from '../../redux/meetingSlice';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CustomTextField = styled(TextField)({
  backgroundColor: '#F9F9F9',
  marginTop: 10,
  borderRadius: '0px',
  borderBottom: '1px solid #A0A0A0',
  '& .MuiOutlinedInput-root': {
    padding: '0px',
    '& fieldset': {
      border: 'none', // Remove the default border
    },
    display: 'flex',
    alignItems: 'center',
    '& input': {
      height: '48px', // Set a fixed height for the input
      boxSizing: 'border-box', // Ensure padding is included in the height
      lineHeight: '22px', // Align text vertically
      fontSize: '16px', // Font size for the input
      color: '#000000',
      '&.Mui-disabled': {
        color: '#707070',
        opacity: 0.8,
        '-webkit-text-fill-color': '#000',
      },
    },
    '& input::placeholder': {
      color: '#000', // Placeholder text color
      opacity: 0.8, // Ensure the color is applied (overrides browser default opacity)
    },
  },
  '& .MuiInputAdornment-root': {
    marginRight: '10px',
    marginLeft: 10,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 2,
  },
});

const CustomIcon = styled('div')({
  color: '#5abcc9',
  backgroundColor: '#DFEBFF',
  padding: '4px',
  borderRadius: '5px',
  display: 'flex',
  alignItems: 'center', // Vertically center the icon inside the box
  justifyContent: 'center',
  width: 20,
  height: 20,
});

const ParticipantTab = ({
  onSetOpenSettingMenu,
  persistedUserName,
  phoneNumber,
  email,
}) => {
  // const socket = useSocket();
  const [meetingId, setMeetingId] = useState(null);
  const [meetingPhraseLocal, setMeetingPhraseLocal] = useState(null);
  const [username, setUsername] = useState(persistedUserName);
  const [error, setError] = useState(null);
  const [openTooltip, setOpenTooltip] = useState(true);
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importantError, setImportantError] = useState(null);

  const reduxmeetingId = useSelector((state) => state.meeting.meetingId);
  const reduxmeetingPhrase = useSelector(
    (state) => state.meeting.meetingPhrase,
  );

  const { joinRoom } = useWebRTC();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const { t } = useTranslation();

  useEffect(() => {
    // Set a timeout to close the tooltip after 3 seconds (3000ms)
    const timer = setTimeout(() => {
      setOpenTooltip(false);
    }, 5000); // Adjust the time as needed

    return () => clearTimeout(timer); // Clean up the timer on unmount
  }, []);

  useEffect(() => {
    if (reduxmeetingId) {
      setMeetingId(reduxmeetingId);
    }
  }, [reduxmeetingId]);

  useEffect(() => {
    if (reduxmeetingPhrase) {
      setMeetingPhraseLocal(reduxmeetingPhrase);
    }
  }, [reduxmeetingPhrase]);

  const handleCloseSnackbar = () => {
    setCopiedToClipboard(false);
  };

  const isValidMeetingId = (str) => {
    // Nanoid default alphabet: A-Za-z0-9_-
    // Length: 10 characters (as specified in your generation code)
    const nanoidPattern = /^[A-Za-z0-9_-]{10}$/;
    return nanoidPattern.test(str);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;

    // Clear previous errors
    setError(null);

    // Check if input matches nanoid format
    if (isValidMeetingId(value)) {
      setMeetingId(value);
      setMeetingPhraseLocal(null);
    } else {
      setMeetingPhraseLocal(value);
      setMeetingId(null);
    }
  };

  const onClickHandler = async () => {
    if (!meetingId && !meetingPhraseLocal) {
      setError('Please enter a valid meeting ID or phrase');
      return;
    }

    setLoading(true);

    let meetingIDToJoin = meetingId;

    if (meetingPhraseLocal && !meetingId) {
      try {
        meetingIDToJoin = await new Promise((resolve, reject) => {
          socket.emit(
            'getMeetingForPhrase',
            meetingPhraseLocal,
            async ({ meetingID, message }) => {
              console.log('meetingID from phrase', meetingID);

              if (!meetingID || !isValidMeetingId(meetingID)) {
                setError(message || 'Invalid or not found meeting ID');
                reject(new Error(message || 'Invalid or not found meeting ID'));
                setLoading(false);
                return;
              }

              resolve(meetingID);
            },
          );
        });
      } catch (e) {
        setLoading(false);
        return;
      }
    }

    if (!meetingIDToJoin || !isValidMeetingId(meetingIDToJoin)) {
      setError('Invalid meeting ID');
      setLoading(false);
      return;
    }

    if (meetingIDToJoin && isValidMeetingId(meetingIDToJoin)) {
      try {
        const { joined, hostSocketId, isHost } =
          await joinRoom(meetingIDToJoin);

        console.log('clicked', joined, hostSocketId, isHost);

        if (joined) {
          if (username !== persistedUserName) {
            await new Promise((resolve) => {
              socket.emit('updateUsername', { username, phoneNumber, email });
              resolve();
            });
          }

          // Then update redux state
          dispatch(joinMeeting(meetingIDToJoin));
          dispatch(setHostSocketId(hostSocketId));
          dispatch(setIsHost(isHost));
          if (meetingPhraseLocal) {
            dispatch(setMeetingPhrase(meetingPhraseLocal));
          }

          const serializedData = JSON.stringify({
            meetingId: meetingIDToJoin,
            hostSocketId,
            isHost,
            meetingPhrase: meetingPhraseLocal,
          });

          localStorage.setItem('meetingData', serializedData);

          // Add a small delay before navigation to ensure state updates complete
          setTimeout(() => {
            setLoading(false);
            navigate(`/videocall/${meetingIDToJoin}`);
          }, 100);

          // navigate(`/videocall/${meetingIDToJoin}`);
        }
      } catch (e) {
        console.log(e, 'error after joinRoom');
        if (
          e.message &&
          e.message.includes('Failed to acquire even audio-only media')
        ) {
          const message = t(
            'No camera detected. Please check your settings and try again.',
          );
          setImportantError(message);
        }
        setError(e?.error);
        setLoading(false);
      }
    }
  };

  const handleWhatsAppShare = () => {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent('Join meeting with following link:')} ${encodeURIComponent(`https://app.myunderstood.com/meeting?meetingId=${meetingId}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Helper function to get display value with correct priority
  const getDisplayValue = () => {
    if (meetingPhraseLocal) {
      return meetingPhraseLocal;
    }
    if (meetingId) {
      return meetingId;
    }
    return '';
  };

  const handleCopyClick = () => {
    const valueToCopy = getDisplayValue();
    if (valueToCopy) {
      navigator.clipboard.writeText(valueToCopy).then(() => {
        console.log('Text copied to clipboard!');
        setCopiedToClipboard(true);
      });
    }
  };

  const handleCopyShare = () => {
    navigator.clipboard
      .writeText(`https://app.myunderstood.com/meeting?meetingId=${meetingId}`)
      .then(() => {
        console.log('Text copied to clipboard!');
      });
  };

  // Helper to determine if the input is valid and join should be enabled
  const isValidInput = () => {
    const value = getDisplayValue();
    return value && (meetingPhraseLocal || isValidMeetingId(value));
  };

  const tooltipTitle = t('Language and settings');

  return (
    <div>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingRight: '18px',
          // padding: '8px 16px', // Adjust padding as needed
        }}
      >
        <p className="host-control-title"> {t('Join Meeting')} </p>
        <Tooltip title={tooltipTitle} open={openTooltip} placement="top" arrow>
          <IconButton
            aria-label="settings"
            edge="end"
            onClick={() => onSetOpenSettingMenu((prev) => !prev)}
          >
            <SettingsIcon sx={{ color: ' #DF4303' }} />
          </IconButton>
        </Tooltip>
      </Box>

      <CustomTextField
        placeholder={t('Add Username')}
        value={username && username !== 'new_user' ? username : ''}
        onChange={(e) => setUsername(e.target.value)}
        variant="outlined"
        fullWidth
        margin="normal"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <CustomIcon>
                <AddIcon />
              </CustomIcon>
            </InputAdornment>
          ),
        }}
      />
      <CustomTextField
        placeholder={t('Insert Meeting ID')}
        variant="outlined"
        fullWidth
        margin="normal"
        value={getDisplayValue()}
        onChange={handleInputChange}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <CustomIcon>
                <Videocam />
              </CustomIcon>
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                disabled={!getDisplayValue()}
                onClick={handleCopyClick}
              >
                <CopyIcon color="action" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={copiedToClipboard}
        onClose={handleCloseSnackbar}
        message={`Successfully Copied`}
        key={'bottom' + 'center'}
        autoHideDuration={800}
      />
      {error && <FormHelperText error>{error}</FormHelperText>}

      <Typography
        sx={{
          fontSize: '16px',
          fontWeight: 500,
          lineHeight: '22px',
          textAlign: 'center',
        }}
      >
        {t('Share Link via')}
      </Typography>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <IconButton
          onClick={handleWhatsAppShare}
          aria-label="Share on WhatsApp"
          sx={{
            backgroundColor: '#DFEBFF',
            margin: '5px',
          }}
        >
          <WhatsAppIcon style={{ color: '#25D366' }} />
        </IconButton>

        {/* Link Copy Button */}
        <IconButton
          onClick={handleCopyShare}
          aria-label="Copy Link"
          sx={{
            backgroundColor: '#DFEBFF',
            margin: '5px',
          }}
        >
          <LinkIcon />
        </IconButton>
      </Box>

      {importantError && (
        <Alert severity="error" sx={{ marginTop: '10px' }}>
          {importantError}
        </Alert>
      )}
      <Button
        variant="contained"
        color="primary"
        fullWidth
        className="create-invite-button"
        onClick={onClickHandler}
        disabled={!isValidInput()}
        sx={{ marginTop: '45px', color: '#fff', fontSize: '18px' }}
      >
        {loading ? <CircularProgress size={24} color="inherit" /> : t('Join')}
      </Button>
    </div>
  );
};

export default ParticipantTab;
