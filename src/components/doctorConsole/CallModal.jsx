import { useEffect, useRef, useState } from 'react'
import { ZegoExpressEngine } from 'zego-express-engine-webrtc'

export default function CallModal({ call, onClose, apiBaseUrl, authToken }) {
  const [callState, setCallState] = useState('connecting') // connecting, active, ended
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState(null)

  const zegoRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const timerRef = useRef(null)
  const remoteAudioRef = useRef(null)

  useEffect(() => {
    if (!call?.credentials) return

    const initCall = async () => {
      try {
        const { appId, token, roomId, userId } = call.credentials

        if (!appId || !token || !roomId || !userId) {
          throw new Error('Missing call credentials')
        }

        // Initialize Zegocloud engine
        const zego = new ZegoExpressEngine(appId, 'wss://webliveroom-api.zegocloud.com/ws')
        zegoRef.current = zego

        // Set up event listeners
        zego.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
          if (updateType === 'ADD') {
            for (const stream of streamList) {
              const remoteStream = await zego.startPlayingStream(stream.streamID)
              remoteStreamRef.current = remoteStream
              if (remoteAudioRef.current && remoteStream) {
                remoteAudioRef.current.srcObject = remoteStream
                remoteAudioRef.current.play().catch(err => console.error('Failed to play remote audio', err))
              }
            }
          }
        })

        zego.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
          console.log('Room state:', state, errorCode)
          if (state === 'CONNECTED') {
            setCallState('active')
            startCallTimer()
            updateCallStatus('active')
          } else if (state === 'DISCONNECTED' && errorCode !== 0) {
            setError('Connection lost')
            setCallState('ended')
          }
        })

        // Login to room
        await zego.loginRoom(
          roomId,
          token,
          { userID: userId, userName: userId },
          { userUpdate: true }
        )

        // Create and publish local stream
        const localStream = await zego.createStream({
          camera: { audio: true, video: false }
        })
        localStreamRef.current = localStream

        const publishStreamId = `${roomId}_${userId}_call`
        await zego.startPublishingStream(publishStreamId, localStream)

        console.log('Call initiated successfully')
      } catch (err) {
        console.error('Failed to initialize call', err)
        setError(err.message || 'Failed to start call')
        setCallState('ended')
      }
    }

    initCall()

    return () => {
      cleanup()
    }
  }, [call])

  const startCallTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1)
    }, 1000)
  }

  const updateCallStatus = async (status) => {
    if (!authToken || !call?.callId) return
    
    try {
      await fetch(`${apiBaseUrl}/api/calls/${call.callId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      })
    } catch (err) {
      console.error('Failed to update call status', err)
    }
  }

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    if (zegoRef.current) {
      zegoRef.current.logoutRoom()
      zegoRef.current.destroyEngine()
      zegoRef.current = null
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }

    remoteStreamRef.current = null
  }

  const handleEndCall = async () => {
    await updateCallStatus('ended')
    setCallState('ended')
    cleanup()
    setTimeout(() => onClose(), 1000)
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMuted(!isMuted)
    }
  }

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Voice Call</h2>
          <div style={styles.status}>
            {callState === 'connecting' && '📞 Connecting...'}
            {callState === 'active' && `✅ Active - ${formatDuration(callDuration)}`}
            {callState === 'ended' && '❌ Call Ended'}
          </div>
        </div>

        {error && (
          <div style={styles.error}>
            ⚠️ {error}
          </div>
        )}

        <div style={styles.content}>
          <div style={styles.avatar}>
            <div style={styles.avatarCircle}>
              {callState === 'connecting' && '📞'}
              {callState === 'active' && '🗣️'}
              {callState === 'ended' && '✅'}
            </div>
            <p style={styles.callInfo}>Calling Patient</p>
          </div>

          <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

          <div style={styles.controls}>
            <button
              onClick={toggleMute}
              style={{
                ...styles.controlButton,
                ...(isMuted ? styles.mutedButton : {}),
              }}
              disabled={callState !== 'active'}
            >
              {isMuted ? '🔇 Unmute' : '🎤 Mute'}
            </button>

            <button
              onClick={handleEndCall}
              style={styles.endButton}
              disabled={callState === 'ended'}
            >
              📵 End Call
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  header: {
    marginBottom: '20px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  status: {
    fontSize: '16px',
    color: '#666',
  },
  error: {
    backgroundColor: '#fee',
    color: '#c00',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
  },
  content: {
    textAlign: 'center',
  },
  avatar: {
    margin: '40px 0',
  },
  avatarCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    backgroundColor: '#e3f2fd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    margin: '0 auto 16px',
  },
  callInfo: {
    fontSize: '18px',
    color: '#333',
    margin: 0,
  },
  controls: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '32px',
  },
  controlButton: {
    padding: '12px 24px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#2196f3',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  mutedButton: {
    backgroundColor: '#f44336',
  },
  endButton: {
    padding: '12px 24px',
    fontSize: '16px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#f44336',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
}
