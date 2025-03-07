import React, { useRef, useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
// import GoogleAuthentication from './GoogleAuthentication';
import PhoneSignIn from './PhoneSignIn';
// import SignUpModal from './SignUpModal';
import { styled } from '@mui/material/styles';
import { ReactComponent as LogoIcon } from '../assets/understood_logo.svg';
import { useTranslation } from 'react-i18next';

const BackgroundLogo = styled(Box)(() => ({
  position: 'absolute ',
  right: 0,
  transform: 'translate(0%)',
  height: '100%',
  overflow: 'hidden',
  opacity: 0.06,

  '& svg': {
    width: '106%', // Make the SVG twice as wide
    height: '100%',
    position: 'relative',
    left: '-46%', // Shift the SVG to the left to show only the left half
  },
}));

const UserLogin = () => {
  const [loginMethod, setLoginMethod] = useState(null);
  const { t } = useTranslation();
  const [isPhoneNumberSubmitted, setIsPhoneNumberSubmitted] = useState(false);
  // const [isModalOpen, setIsModalOpen] = useState(false);
  const phoneLoginRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleButtonClick = (e) => {
    e.preventDefault();
    if (phoneLoginRef.current) {
      if (!isPhoneNumberSubmitted) {
        phoneLoginRef.current.sendOTP();
      } else {
        phoneLoginRef.current.verifyOTP();
      }
    }
  };

  // const handleModalClose = () => {
  //   setIsModalOpen(false);
  // };

  return (
    <Box
      sx={{
        margin: '16px',
      }}
    >
      {/* Background logo */}
      <BackgroundLogo>
        <LogoIcon />
      </BackgroundLogo>
      {!isPhoneNumberSubmitted && (
        <div>
          <Typography
            sx={{
              textAlign: 'center',
              textDecoration: 'underline',
              color: '#000',
            }}
          >
            {t('UI 2.0 coming soon..')} 🎉
          </Typography>
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: '32px',
              lineHeight: '48px',
              marginTop: '90px',
              color: '#DF4303',
            }}
          >
            {t('Welcome Back!')}
          </Typography>
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: '15px',
              lineHeight: '22px',
              color: '#595959',
            }}
          >
            {t('One platform, countless voices, endless possibilities.')}
          </Typography>
        </div>
      )}
      {loginMethod !== 'googleLogin' && (
        <PhoneSignIn
          onLogin={setLoginMethod}
          onSetIsPhoneNumberSubmitted={setIsPhoneNumberSubmitted}
          ref={phoneLoginRef}
          setLoading={setLoading}
        />
      )}

      {/* Disabling the phone google login till we get the activation and testing
      {!loginMethod && (
        <Typography
          sx={{
            textAlign: 'center',
            color: '#595959',
            margin: '40px 0',
          }}
        >
          {t(' or')}
        </Typography>
      )}
      {loginMethod !== 'phoneLogin' && (
        <GoogleAuthentication onLogin={setLoginMethod} />
      )} */}

      <Button
        variant="contained"
        color="primary"
        fullWidth
        className="create-invite-button"
        onClick={handleButtonClick}
        sx={{
          marginTop: !isPhoneNumberSubmitted ? '100px' : '330px',
          color: '#fff',
          fontSize: '18px',
        }}
        id="sign-in-button"
      >
        {loading ? (
          <CircularProgress size={24} color="inherit" />
        ) : isPhoneNumberSubmitted ? (
          t('Verify & Join!')
        ) : (
          t('Send OTP')
        )}
      </Button>

      {/* Disabling signup as mobile login will take care of it
      {!isPhoneNumberSubmitted && (
        <Typography
          sx={{
            color: '#595959',
            fontWeight: 500,
            fontSize: '15px',
            lineHeight: '22px',
            textAlign: 'center',
          }}
        >
          {t('Don’t have an account?')}
          <Button
            variant="text"
            sx={{ color: '#DF4303' }}
            onClick={() => setIsModalOpen(true)}
          >
            {t('Sign Up')}
          </Button>
        </Typography>
      )}
      <SignUpModal open={isModalOpen} handleClose={handleModalClose} /> */}
    </Box>
  );
};

export default UserLogin;
