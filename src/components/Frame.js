import styled, { keyframes } from "styled-components";
import { useEffect, useRef, useState } from "preact/hooks";

import { Col } from "./components";
import { createRef } from "preact";
import { memo } from "preact/compat";

let noMediaRecorder = false;
try {
  MediaRecorder;
} catch {
  noMediaRecorder = true;
}

const Container = styled.div`
  display: flex;
  position: relative;
  overflow: hidden;
`;
const screenHeight = `calc(100vh - 122px)`;
const screenMinHeight = `500px`;
const screenMinWidth = `0px`;

// Device selector styling
const DeviceSelector = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  background: rgba(0, 0, 0, 0.8);
  padding: 10px;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
  
  select {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid #f38322;
    border-radius: 3px;
    padding: 5px;
    font-size: 12px;
    width: 100%;
  }
  
  label {
    color: white;
    font-size: 12px;
    margin-bottom: 2px;
    display: block;
  }
`;

const PreviewScreen = styled.video`
  position: relative;
  z-index: 0;
  left: 0;
  right: 0;
  height: ${screenHeight};
  min-height: ${screenMinHeight};
  min-width: ${screenMinWidth};
  transform: scale(${({ mirror }) => mirror}, 1);
  margin: auto;
`;

const PreviewText = styled.div`
  z-index: 10;
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 20px;
  text-shadow: -2px 2px black;
`;

const Screen = styled.video`
  position: absolute;
  z-index: 1;
  opacity: 0;
  left: 0;
  right: 0;
  height: ${screenHeight};
  min-height: ${screenMinHeight};
  min-width: ${screenMinWidth};
  margin: auto;
  transform: scale(${({ mirror }) => mirror}, 1);
`;

const OverlayBox = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: ${screenHeight};
  min-height: ${screenMinHeight};
  min-width: ${screenMinWidth};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const LoadingBox = styled(OverlayBox)`
  text-shadow: 0px 0px 4px black;
  margin-top: 30px;
`;

const LoadingIcon = styled.div`
  position: relative;
  margin-top: 50px;
  width: 100px;
  height: 100px;
  h2 {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
  }
`;

const spinKeyframes = keyframes`
    from {
        transform: rotate(0deg);
    } to {
        transform: rotate(-360deg);
    }
`;

const LoadingSpinner = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: ${spinKeyframes} ${({ time }) => time}s linear infinite;
  img {
    width: 100px;
  }
`;

const InfoBox = styled.div`
  margin: 30px 0px;
  height: 100%;
  border-radius: 10px;
  justify-content: center;
  background-color: #ffdfbd;
  font-size: 20px;
  opacity: 1;
  transition: opacity 0.4s;
  overflow: hidden;
  width: 100%;
  padding: 10px 0px;

  .content {
    height: 100%;
    display: flex;
    justify-content: center;
  }

  color: black;

  iframe {
    margin: 20px 0px;
  }

  h1 {
    font-size: 20px;
    margin-top: 0px;
    color: black;
  }

  div {
    z-index: 1;
    color: black;
  }

  video {
    margin-top: -50px;
    margin-bottom: -50px;
    width: 60%;
  }
`;

const Description = styled.div`
  max-width: 480px;
  span:nth-child(1) {
    color: #840088;
  }
  span:nth-child(2) {
    color: #001f88;
  }
  span:nth-child(3) {
    color: #008886;
  }
  span:nth-child(4) {
    color: #008803;
  }
  span:nth-child(5) {
    color: #888300;
  }
`;

const Footnote = styled.div`
  font-size: 15px;
  color: #666 !important;
  a {
    color: #666;
  }
`;

const Apology = styled.div`
  margin-top: 10px;
  color: #d83131 !important;
`;

const MuteButton = styled.img`
  position: absolute;
  opacity: 50%;
  z-index: 1000;
  width: 25px;
  height: 25px;
  opacity: 0;
  bottom: 5px;
  right: 5px;
  cursor: pointer;
  transition: opacity 0.3s;
  
  &:hover {
    opacity: 0.8 !important;
  }
`;

function Frame({
  start,
  replay,
  replayDelay,
  replaySpeed,
  ghost,
  ghostDelay,
  setReplayReady,
  setCameraReady,
  preview,
  setPreview,
  downloadButtonRef,
  mirror,
  mute,
  delayMute,
}) {
  const [mode, setMode] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(0);
  const infoBoxRef = useRef(null);
  const screen1Ref = useRef(null);
  const screen2Ref = useRef(null);
  const muteButtonRef = useRef(null);
  const previewScreenRef = useRef(null);
  const replayScreenRef = useRef(null);
  const youtubeRef = useRef(null);

  // Device management state
  const [videoDevices, setVideoDevices] = useState([]);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState(null);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState(null);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [streamError, setStreamError] = useState(null);

  const ghostRecorder1 = useRef(null);
  const ghostRecorder2 = useRef(null);
  const ghostInterval = useRef(null);
  const ghostStaggerTimeout = useRef(null);
  const ghostMute = useRef(true);

  const replayRecorder1 = useRef(null);
  const replayRecorder2 = useRef(null);
  const replayInterval = useRef(null);
  const replayStaggerTimeout = useRef(null);
  const replayBlobURL = useRef(null);
  const longerReplayRecorder = useRef(1);
  const finalReplay = useRef(false);

  const loadingTimeout = useRef(null);
  const loadingCountdownInterval = useRef(null);

  const [showLoading, setShowLoading] = useState(false);

  let streamRef = createRef();

  // Enumerate devices on mount
  useEffect(() => {
    enumerateDevices();
    
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, []);

  // Function to enumerate and prioritize devices
  const enumerateDevices = async () => {
    try {
      // Request permissions first
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      tempStream.getTracks().forEach(track => track.stop());

      // Now enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      setVideoDevices(videoInputs);
      setAudioDevices(audioInputs);

      // Prioritize rear camera (environment facing) for mobile
      const rearCamera = videoInputs.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      // Only set if not already selected
      if (!selectedVideoDevice) {
        setSelectedVideoDevice(rearCamera?.deviceId || videoInputs[0]?.deviceId);
      }

      // Prioritize external microphones
      const externalMic = audioInputs.find(device => 
        device.label.toLowerCase().includes('external') ||
        device.label.toLowerCase().includes('usb') ||
        device.label.toLowerCase().includes('headset') ||
        (!device.label.toLowerCase().includes('built-in') && 
         !device.label.toLowerCase().includes('internal'))
      );
      
      if (!selectedAudioDevice) {
        setSelectedAudioDevice(externalMic?.deviceId || audioInputs[0]?.deviceId);
      }

      console.log('Available video devices:', videoInputs);
      console.log('Available audio devices:', audioInputs);
    } catch (error) {
      console.error('Error enumerating devices:', error);
      setStreamError('Could not access camera/microphone. Please check permissions.');
    }
  };

  // Get improved media constraints
  const getMediaConstraints = () => {
    return {
      video: {
        deviceId: selectedVideoDevice ? { exact: selectedVideoDevice } : undefined,
        width: { ideal: 1920, min: 1280 },
        height: { ideal: 1080, min: 720 },
        frameRate: { ideal: 60, min: 30 },
        facingMode: selectedVideoDevice ? undefined : { ideal: 'environment' }
      },
      audio: {
        deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
        channelCount: { ideal: 2 }
      }
    };
  };

  const stopRecorder = async (recorder) => {
    if (recorder.current && recorder.current.state === "recording") {
      recorder.current.ondataavailable = null;
      recorder.current.stop();
    }
  };

  const setPreviewVideo = (data) => {
    const blob = new Blob([data], { type: "video/webm" });
    replayBlobURL.current = URL.createObjectURL(blob);
    downloadButtonRef.current.href = replayBlobURL.current;
    const date = new Date();
    downloadButtonRef.current.download = `${date.getFullYear()}-${
      date.getMonth() + 1
    }-${date.getDate()}__${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.webm`;
    replayScreenRef.current.src = replayBlobURL.current;
  };

  useEffect(() => {
    try {
      replayScreenRef.current.playbackRate = replaySpeed;
    } catch (e) {}
  }, [replaySpeed]);

  useEffect(() => {
    if (replay) {
      setMode("REPLAY");
      setPreview(false);
    } else if (!start) {
      setMode("STOP");
      setPreview(false);
    } else if (ghost) {
      setMode("GHOST");
    } else if (!ghost) {
      setMode("STREAM");
    }
    setCountdown(Math.ceil(ghostDelay));
    countdownRef.current = Math.ceil(ghostDelay);
  }, [start, ghostDelay, ghost, replay]);

  useEffect(() => {
    if (preview) {
      previewScreenRef.current.style.opacity = 1;
      previewScreenRef.current.style.zIndex = 3;
      screen1Ref.current.style.opacity = 0;
      screen2Ref.current.style.opacity = 0;
      muteButtonRef.current.style.opacity = 0;
      previewScreenRef.current.style.border = "dashed 2px #ddd";
    } else {
      previewScreenRef.current.style.zIndex = 0;
      screen1Ref.current.style.opacity = 1;
      screen2Ref.current.style.opacity = 1;
      previewScreenRef.current.style.border = "none";
    }
  }, [preview]);

  // Handle device change
  const handleDeviceChange = async (deviceId, type) => {
    if (type === 'video') {
      setSelectedVideoDevice(deviceId);
    } else {
      setSelectedAudioDevice(deviceId);
    }

    // If stream is active, restart it with new devices
    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      streamRef.current = null;
      
      // Trigger re-initialization with new device
      if (mode === "GHOST" || mode === "STREAM") {
        try {
          const newStream = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
          streamRef.current = newStream;
          previewScreenRef.current.srcObject = newStream;
          await previewScreenRef.current.play();
          setStreamError(null);
        } catch (error) {
          console.error('Error restarting stream with new device:', error);
          setStreamError('Failed to switch device. Please check permissions.');
        }
      }
    }
  };

  // Main effect for mode changes
  useEffect(() => {
    let isMounted = true;

    const initializeMode = async () => {
      setReplayReady(false);
      setShowLoading(false);
      setStreamError(null);

      screen1Ref.current.muted = true;
      screen2Ref.current.muted = true;
      
      if (mode === "STOP" || mode === null) {
        infoBoxRef.current.style.opacity = 1;
        infoBoxRef.current.style.zIndex = 10;
        youtubeRef.current.src = "https://www.youtube.com/embed/YpGR1l1sapI";
        setShowDeviceSelector(false);
      } else {
        infoBoxRef.current.style.opacity = 0;
        infoBoxRef.current.style.zIndex = 0;
        youtubeRef.current.src = "";
        setShowDeviceSelector(true);
      }

      if (mode === "REPLAY") {
        finalReplay.current = true;
        if (longerReplayRecorder.current === 1) {
          await stopRecorder(replayRecorder1);
        } else {
          await stopRecorder(replayRecorder2);
        }
        replayScreenRef.current.style.zIndex = 3;
        replayScreenRef.current.style.opacity = 1;
        replayScreenRef.current.load();
        replayScreenRef.current.onloadeddata = function () {
          replayScreenRef.current.play();
        };
      } else {
        finalReplay.current = false;
        URL.revokeObjectURL(replayBlobURL.current);
        replayScreenRef.current.style.zIndex = 0;
        replayScreenRef.current.style.opacity = 0;
        replayScreenRef.current.src = null;
      }

      // Init Stream, Screens, & Recorders with IMPROVED constraints
      if (
        (mode == "GHOST" || mode == "STREAM") &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        if (!streamRef.current) {
          try {
            const constraints = getMediaConstraints();
            console.log('Requesting stream with constraints:', constraints);
            
            streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Stream obtained with tracks:', 
              streamRef.current.getTracks().map(t => ({
                kind: t.kind,
                label: t.label,
                settings: t.getSettings()
              }))
            );
            
            if (isMounted) {
              previewScreenRef.current.srcObject = streamRef.current;
              await previewScreenRef.current.play();
            }
          } catch (error) {
            console.error('Error getting media with high quality constraints:', error);
            setStreamError('Could not access camera with high quality settings. Trying basic settings...');
            
            // Fallback to basic constraints
            try {
              streamRef.current = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
              });
              
              if (isMounted) {
                previewScreenRef.current.srcObject = streamRef.current;
                await previewScreenRef.current.play();
                setStreamError(null);
              }
            } catch (fallbackError) {
              console.error('Fallback also failed:', fallbackError);
              setStreamError('Cannot access camera/microphone. Please check permissions and try again.');
              return;
            }
          }
        }

        // Improved MediaRecorder options
        const getRecorderOptions = () => {
          if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
            return { 
              mimeType: 'video/webm;codecs=vp9,opus',
              videoBitsPerSecond: 5000000,
              audioBitsPerSecond: 128000
            };
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            return { 
              mimeType: 'video/webm;codecs=vp8,opus',
              videoBitsPerSecond: 3000000,
              audioBitsPerSecond: 128000
            };
          } else {
            return { 
              mimeType: 'video/webm',
              videoBitsPerSecond: 2000000,
              audioBitsPerSecond: 128000
            };
          }
        };

        const recorderOptions = getRecorderOptions();
        console.log('Using recorder options:', recorderOptions);

        if (isMounted) {
          replayRecorder1.current = new MediaRecorder(
            previewScreenRef.current.captureStream
              ? previewScreenRef.current.captureStream()
              : previewScreenRef.current.mozCaptureStream(),
            recorderOptions
          );
          replayRecorder2.current = new MediaRecorder(
            previewScreenRef.current.captureStream
              ? previewScreenRef.current.captureStream()
              : previewScreenRef.current.mozCaptureStream(),
            recorderOptions
          );
          
          replayRecorder1.current.ondataavailable = (event) => {
            longerReplayRecorder.current = 2;
            if (finalReplay.current) {
              setPreviewVideo(event.data);
            }
            finalReplay.current = false;
          };
          replayRecorder2.current.ondataavailable = (event) => {
            longerReplayRecorder.current = 1;
            if (finalReplay.current) {
              setPreviewVideo(event.data);
            }
            finalReplay.current = false;
          };
          
          longerReplayRecorder.current = 1;
          replayRecorder1.current.start();
          replayStaggerTimeout.current = window.setTimeout(async () => {
            if (isMounted && replayRecorder2.current) {
              replayRecorder2.current.start();
            }
          }, replayDelay * 1000 + ghostDelay * 1000);

          replayInterval.current = window.setInterval(async () => {
            if (isMounted && replayRecorder1.current) {
              await stopRecorder(replayRecorder1);
              replayRecorder1.current.start();
              replayStaggerTimeout.current = window.setTimeout(async () => {
                if (isMounted && replayRecorder2.current) {
                  await stopRecorder(replayRecorder2);
                  replayRecorder2.current.start();
                }
              }, replayDelay * 1000 + ghostDelay * 1000);
            }
          }, (replayDelay * 1000 + ghostDelay * 1000) * 2);

          setCameraReady(true);
        }
      } else {
        // Stop Stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        streamRef.current = null;
        if (previewScreenRef.current) {
          previewScreenRef.current.srcObject = null;
        }

        // Stop Replay Recorders
        await stopRecorder(replayRecorder1);
        await stopRecorder(replayRecorder2);
        replayRecorder1.current = null;
        replayRecorder2.current = null;
        clearInterval(replayInterval.current);
        clearTimeout(replayStaggerTimeout.current);
      }

      if (mode === "STREAM") {
        previewScreenRef.current.style.opacity = 1;
        setReplayReady(true);
      } else if (!preview) {
        previewScreenRef.current.style.opacity = 0.5;
      }

      // Init ghost recorder
      if (mode === "GHOST") {
        muteButtonRef.current.style.zIndex = 3;
        muteButtonRef.current.style.opacity = 0.4;
        
        if (!ghostRecorder1.current) {
          const ghostRecorderOptions = getRecorderOptions();
          
          ghostRecorder1.current = new MediaRecorder(
            previewScreenRef.current.captureStream
              ? previewScreenRef.current.captureStream()
              : previewScreenRef.current.mozCaptureStream(),
            ghostRecorderOptions
          );
          ghostRecorder2.current = new MediaRecorder(
            previewScreenRef.current.captureStream
              ? previewScreenRef.current.captureStream()
              : previewScreenRef.current.mozCaptureStream(),
            ghostRecorderOptions
          );
          
          ghostRecorder1.current.ondataavailable = async (event) => {
            if (!isMounted) return;
            screen1Ref.current.srcObject = null;
            URL.revokeObjectURL(screen1Ref.current.src);
            screen1Ref.current.src = URL.createObjectURL(event.data);
            screen1Ref.current.style.zIndex = 2;
            screen2Ref.current.style.zIndex = 1;
            await screen1Ref.current.play();
            setReplayReady(true);
            if (!ghostMute.current) {
              screen2Ref.current.muted = true;
              screen1Ref.current.muted = false;
            }
          };
          
          ghostRecorder2.current.ondataavailable = (event) => {
            if (!isMounted) return;
            screen2Ref.current.srcObject = null;
            URL.revokeObjectURL(screen2Ref.current.src);
            screen2Ref.current.src = URL.createObjectURL(event.data);
            screen2Ref.current.style.zIndex = 2;
            screen1Ref.current.style.zIndex = 1;
            screen2Ref.current.play();
            setReplayReady(true);
            if (!ghostMute.current) {
              screen1Ref.current.muted = true;
              screen2Ref.current.muted = false;
            }
          };
        }

        setShowLoading(true);
        loadingTimeout.current = window.setTimeout(async () => {
          if (isMounted && !preview && previewScreenRef.current.style.opacity < 1) {
            screen2Ref.current.style.opacity = 1;
            screen1Ref.current.style.opacity = 1;
          }
          setShowLoading(false);
        }, ghostDelay * 1000);

        loadingCountdownInterval.current = window.setInterval(() => {
          if (isMounted) {
            setCountdown(countdownRef.current - 1);
            countdownRef.current = countdownRef.current - 1;
            if (countdownRef.current <= 0) {
              clearInterval(loadingCountdownInterval.current);
            }
          }
        }, 1000);

        ghostStaggerTimeout.current = window.setTimeout(async () => {
          if (isMounted && ghostRecorder2.current) {
            await ghostRecorder2.current.start();
          }
        }, ghostDelay * 1000 * 0.5);
        
        if (ghostRecorder1.current) {
          ghostRecorder1.current.start();
        }

        ghostInterval.current = window.setInterval(async () => {
          if (isMounted && ghostRecorder1.current && ghostRecorder1.current.state !== "inactive") {
            await stopRecorder(ghostRecorder1);
            await ghostRecorder1.current.start();
          }
          ghostStaggerTimeout.current = window.setTimeout(async () => {
            if (isMounted && ghostRecorder2.current && ghostRecorder2.current.state !== "inactive") {
              await stopRecorder(ghostRecorder2);
              await ghostRecorder2.current.start();
            }
          }, ghostDelay * 1000 * 0.5);
        }, ghostDelay * 1000);
      } else {
        await stopRecorder(ghostRecorder1);
        await stopRecorder(ghostRecorder2);
        ghostRecorder1.current = null;
        ghostRecorder2.current = null;
        clearTimeout(loadingTimeout.current);
        clearInterval(ghostInterval.current);
        clearTimeout(ghostStaggerTimeout.current);
        clearInterval(loadingCountdownInterval.current);
        
        if (screen2Ref.current) screen2Ref.current.src = null;
        if (screen1Ref.current) screen1Ref.current.src = null;
        if (screen2Ref.current) screen2Ref.current.style.opacity = 0;
        if (screen1Ref.current) screen1Ref.current.style.opacity = 0;
        if (screen2Ref.current) screen2Ref.current.style.zIndex = 0;
        if (screen1Ref.current) screen1Ref.current.style.zIndex = 0;
        if (muteButtonRef.current) {
          muteButtonRef.current.style.zIndex = 0;
          muteButtonRef.current.style.opacity = 0;
        }
      }
    };

    initializeMode();

    return () => {
      isMounted = false;
      // Cleanup timeouts and intervals
      clearTimeout(loadingTimeout.current);
      clearInterval(ghostInterval.current);
      clearTimeout(ghostStaggerTimeout.current);
      clearInterval(loadingCountdownInterval.current);
      clearInterval(replayInterval.current);
      clearTimeout(replayStaggerTimeout.current);
    };
  }, [mode, selectedVideoDevice, selectedAudioDevice]);

  return (
    <Container>
      {/* Device Selector UI */}
      {showDeviceSelector && videoDevices.length > 0 && (
        <DeviceSelector>
          <div>
            <label>Camera:</label>
            <select 
              value={selectedVideoDevice || ''} 
              onChange={(e) => handleDeviceChange(e.target.value, 'video')}
            >
              {videoDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Microphone:</label>
            <select 
              value={selectedAudioDevice || ''} 
              onChange={(e) => handleDeviceChange(e.target.value, 'audio')}
            >
              {audioDevices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Mic ${audioDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
          </div>
          {streamError && (
            <div style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '5px' }}>
              {streamError}
            </div>
          )}
        </DeviceSelector>
      )}

      <OverlayBox>
        <InfoBox ref={infoBoxRef}>
          <Col className="content align-center">
            <div>
              {noMediaRecorder && (
                <Apology>
                  Sorry, this browser does not support this app yet!
                </Apology>
              )}
              {streamError && !noMediaRecorder && (
                <Apology>
                  {streamError}
                </Apology>
              )}
            </div>
            <iframe
              ref={youtubeRef}
              width="560"
              height="315"
              src="https://www.youtube.com/embed/YpGR1l1sapI"
              frameBorder="0"
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
            <Description>
              <div>
                One More Try uses a <b>Delay Camera</b> that lets you
                <br />
                <b>try something</b> and then <b>see it play back right away</b>
              </div>
              <br />
              <div>
                It's perfect for practicing <span>skateboarding</span>,{" "}
                <span>dance</span>, <span>magic</span>, <span>tennis</span>,{" "}
                <span>fashion</span>, <i>ANYTHING!</i>
              </div>
              <hr />
              <Footnote>
                One More Try does not collect ANY data. It works entirely in
                your browser, which means it works offline too! It's also open
                source so you can{" "}
                <a href="https://github.com/tomlum/OneMoreTry" target="_blank" rel="noopener noreferrer">
                  see for yourself!
                </a>
              </Footnote>
            </Description>
          </Col>
        </InfoBox>
      </OverlayBox>
      
      <PreviewScreen
        ref={previewScreenRef}
        mirror={mirror}
        autoPlay
        playsInline
        muted
      />

      {preview && (
        <PreviewText>
          <b>No Delay</b>
        </PreviewText>
      )}
      
      {showLoading && (
        <LoadingBox>
          <h3>Get Started! Your Delay Camera is just catching up!</h3>
          <LoadingIcon>
            <LoadingSpinner time={ghostDelay}>
              <img src="https://s3.us-east-2.amazonaws.com/tomlum/omt-loading-icon.png" alt="Loading" />
            </LoadingSpinner>
            <h2>{countdown}</h2>
          </LoadingIcon>
        </LoadingBox>
      )}
      
      <Screen
        ref={screen1Ref}
        mirror={mirror}
        autoPlay
        playsInline
        muted
      />
      <Screen
        ref={screen2Ref}
        mirror={mirror}
        autoPlay
        playsInline
        muted
      />
      <Screen
        className="holdControls"
        ref={replayScreenRef}
        autoPlay
        playsInline
        controls
        loop
        muted={mute}
      />
      
      <MuteButton
        alt={"Mute/Unmute"}
        ref={muteButtonRef}
        src={"https://s3.us-east-2.amazonaws.com/tomlum/omt-delay-mute-on.png"}
        style={{ zIndex: 10000 }}
        onClick={() => {
          if (muteButtonRef.current.style.opacity > 0) {
            ghostMute.current = !ghostMute.current;
            if (!ghostMute.current) {
              screen1Ref.current.muted = false;
              screen2Ref.current.muted = false;
            } else {
              screen1Ref.current.muted = true;
              screen2Ref.current.muted = true;
            }
            muteButtonRef.current.src = `https://s3.us-east-2.amazonaws.com/tomlum/omt-delay-mute-${
              ghostMute.current ? "on" : "off"
            }.png`;
          }
        }}
      />
    </Container>
  );
}

const FrameMemo = memo(Frame);
export default FrameMemo;
