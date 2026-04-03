import { useEffect, useRef, useState } from 'react'
import { ZegoExpressEngine } from 'zego-express-engine-webrtc'

export default function CallModal({ call, onClose, apiBaseUrl, authToken, onCallStateChange }) {
  const [callState, setCallState] = useState('connecting') // connecting, active, ended
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [error, setError] = useState(null)

  const zegoRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const timerRef = useRef(null)
  const remoteAudioRef = useRef(null)
  const isEndingRef = useRef(false)
  const hasRemoteUserRef = useRef(false)
  const statusPollRef = useRef(null)

  useEffect(() => {
    if (!call?.credentials) {
      console.log('[CallModal] No credentials provided')
      return
    }

    const initCall = async () => {
      try {
        console.log('[CallModal] Starting call initialization')
        console.log('[CallModal] Call object:', call)
        const { appId, token, roomId, userId } = call.credentials

        console.log('[CallModal] Credentials:', { appId, token: token?.substring(0, 20) + '...', roomId, userId })

        if (!appId || !token || !roomId || !userId) {
          throw new Error('Missing call credentials')
        }

        // Initialize Zegocloud engine
        console.log('[CallModal] Creating ZegoExpressEngine...')
        const zego = new ZegoExpressEngine(appId, 'wss://webliveroom-api.zegocloud.com/ws')
        zegoRef.current = zego
        console.log('[CallModal] ZegoExpressEngine created')

        // Set up event listeners
        zego.on('roomStreamUpdate', async (roomID, updateType, streamList) => {
          console.log('[CallModal] roomStreamUpdate:', { roomID, updateType, streamCount: streamList.length, streams: streamList })
          if (updateType === 'ADD') {
            for (const stream of streamList) {
              console.log('[CallModal] Starting to play stream:', stream.streamID, 'from user:', stream.user?.userID)
              
              // Patient has joined - update call state to active
              if (!hasRemoteUserRef.current) {
                hasRemoteUserRef.current = true
                stopStatusPolling() // Stop polling since patient joined
                setCallState('active')
                if (onCallStateChange) onCallStateChange('active')
                startCallTimer()
                updateCallStatus('active')
                console.log('[CallModal] Patient joined - call is now active')
              }
              
              const remoteStream = await zego.startPlayingStream(stream.streamID)
              remoteStreamRef.current = remoteStream
              if (remoteAudioRef.current && remoteStream) {
                remoteAudioRef.current.srcObject = remoteStream
                remoteAudioRef.current.play().catch(err => console.error('[CallModal] Failed to play remote audio', err))
              }
            }
          } else if (updateType === 'DELETE') {
            // Remote stream removed - patient ended the call
            console.log('[CallModal] Stream deleted, streamList:', streamList)
            if (hasRemoteUserRef.current && !isEndingRef.current) {
              console.log('[CallModal] Remote patient stream deleted - patient ended call')
              isEndingRef.current = true
              setError('Patient ended the call')
              setCallState('ended')
              if (onCallStateChange) onCallStateChange('ended')
              setTimeout(() => {
                cleanup()
                onClose()
              }, 2000)
            }
          }
        })

        // Detect when remote user leaves the room
        zego.on('roomUserUpdate', (roomID, updateType, userList) => {
          console.log('[CallModal] roomUserUpdate:', { 
            roomID, 
            updateType, 
            userCount: userList.length,
            users: userList.map(u => ({ userID: u.userID, userName: u.userName }))
          })
          if (updateType === 'ADD') {
            console.log('[CallModal] User(s) joined:', userList.map(u => u.userID))
            
            // Patient has joined - update call state to active (if not already)
            if (!hasRemoteUserRef.current) {
              hasRemoteUserRef.current = true
              stopStatusPolling() // Stop polling since patient joined
              setCallState('active')
              if (onCallStateChange) onCallStateChange('active')
              startCallTimer()
              updateCallStatus('active')
              console.log('[CallModal] Patient joined - call is now active')
            }
          } else if (updateType === 'DELETE') {
            console.log('[CallModal] User(s) left:', userList.map(u => u.userID))
            if (hasRemoteUserRef.current && !isEndingRef.current) {
              // Remote party has left the room
              console.log('[CallModal] Remote patient left the room - ending call')
              isEndingRef.current = true
              setError('Patient ended the call')
              setCallState('ended')
              if (onCallStateChange) onCallStateChange('ended')
              setTimeout(() => {
                cleanup()
                onClose()
              }, 2000)
            }
          }
        })

        zego.on('roomStateUpdate', (roomID, state, errorCode, extendedData) => {
          console.log('[CallModal] Room state update:', { roomID, state, errorCode, extendedData })
          if (state === 'CONNECTED') {
            console.log('[CallModal] Doctor successfully connected to room - waiting for patient...')
            // Don't set to active yet - wait for patient to join
          } else if (state === 'DISCONNECTED' && errorCode !== 0) {
            console.error('[CallModal] Disconnected with error:', errorCode)
            setError('Connection lost')
            setCallState('ended')
          }
        })

        // Login to room
        console.log('[CallModal] Logging into room:', roomId, 'as user:', userId)
        await zego.loginRoom(
          roomId,
          token,
          { userID: userId, userName: userId },
          { userUpdate: true }
        )
        console.log('[CallModal] Successfully logged into room')

        // Create and publish local stream
        console.log('[CallModal] Creating local audio stream...')
        const localStream = await zego.createStream({
          camera: { audio: true, video: false }
        })
        localStreamRef.current = localStream
        console.log('[CallModal] Local stream created')

        const publishStreamId = `${roomId}_${userId}_call`
        console.log('[CallModal] Publishing stream:', publishStreamId)
        await zego.startPublishingStream(publishStreamId, localStream)

        console.log('[CallModal] Call initiated successfully')
        
        // Start polling for call status (to detect if patient rejects)
        startStatusPolling()
      } catch (err) {
        console.error('[CallModal] Failed to initialize call:', err)
        console.error('[CallModal] Error name:', err.name)
        console.error('[CallModal] Error message:', err.message)
        console.error('[CallModal] Error stack:', err.stack)
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

  const checkCallStatus = async () => {
    if (!authToken || !call?.callId || isEndingRef.current) return
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/calls/${call.callId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        const status = data.call?.status
        
        console.log('[CallModal] Poll - call status:', status)
        
        if (status === 'missed' && !hasRemoteUserRef.current) {
          // Patient rejected the call
          console.log('[CallModal] Patient rejected the call')
          stopStatusPolling()
          isEndingRef.current = true
          setError('Patient rejected the call')
          setCallState('ended')
          if (onCallStateChange) onCallStateChange('ended')
          setTimeout(() => {
            cleanup()
            onClose()
          }, 2000)
        } else if (status === 'ended' && !isEndingRef.current) {
          // Call ended by patient
          console.log('[CallModal] Call was ended')
          stopStatusPolling()
          isEndingRef.current = true
          setError('Call ended')
          setCallState('ended')
          if (onCallStateChange) onCallStateChange('ended')
          setTimeout(() => {
            cleanup()
            onClose()
          }, 2000)
        }
      }
    } catch (err) {
      console.error('[CallModal] Failed to check call status', err)
    }
  }

  const startStatusPolling = () => {
    console.log('[CallModal] Starting status polling')
    // Poll every 2 seconds while waiting for patient
    statusPollRef.current = setInterval(checkCallStatus, 2000)
  }

  const stopStatusPolling = () => {
    if (statusPollRef.current) {
      console.log('[CallModal] Stopping status polling')
      clearInterval(statusPollRef.current)
      statusPollRef.current = null
    }
  }

  const cleanup = () => {
    stopStatusPolling()
    
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
    isEndingRef.current = true // Prevent duplicate cleanup
    await updateCallStatus('ended')
    setCallState('ended')
    if (onCallStateChange) onCallStateChange('ended')
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
    <div style={styles.floatingWidget}>
      <div style={styles.widgetHeader}>
        <div>
          <h3 style={styles.widgetTitle}>Voice Call</h3>
          <div style={styles.status}>
            {callState === 'connecting' && '📞 Connecting...'}
            {callState === 'active' && `✅ Active - ${formatDuration(callDuration)}`}
            {callState === 'ended' && '❌ Call Ended'}
          </div>
        </div>
      </div>

      {error && (
        <div style={styles.error}>
          ⚠️ {error}
        </div>
      )}

      <div style={styles.widgetContent}>
        <p style={styles.callInfo}>
          {callState === 'connecting' && 'Waiting for patient to join...'}
          {callState === 'active' && 'Connected - You can now send prescription'}
          {callState === 'ended' && 'Call ended'}
        </p>

        <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

        <div style={styles.controls}>
          <button
            onClick={toggleMute}
            style={{
              ...styles.controlButton,
              ...(isMuted ? styles.mutedButton : {}),
            }}
            disabled={callState !== 'active'}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? '🔇' : '🎤'}
          </button>

          <button
            onClick={handleEndCall}
            style={styles.endButton}
            disabled={callState === 'ended'}
            title="End call"
          >
            📵
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  floatingWidget: {
    position: 'fixed',
    top: '104px',
    right: '20px',
    width: 'min(320px, calc(100vw - 24px))',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    border: '2px solid rgba(56, 161, 236, 0.7)',
    borderRadius: '14px',
    boxShadow: '0 20px 40px rgba(15, 23, 42, 0.22)',
    zIndex: 110,
    padding: '14px 14px 12px',
    backdropFilter: 'blur(10px)',
    color: 'rgba(15, 23, 42, 0.92)',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '18px',
    width: '100%',
    maxWidth: '520px',
    maxHeight: 'calc(100vh - 32px)',
    overflowY: 'auto',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  },
  widgetHeader: {
    marginBottom: '8px',
  },
  widgetTitle: {
    margin: 0,
    fontSize: '1.95rem',
    lineHeight: 1,
    letterSpacing: '-0.01em',
    color: 'rgba(15, 23, 42, 0.95)',
  },
  status: {
    marginTop: '6px',
    fontSize: '0.96rem',
    color: 'rgba(71, 85, 105, 0.9)',
    fontWeight: 500,
  },
  error: {
    backgroundColor: '#fff1f2',
    color: '#b91c1c',
    padding: '8px',
    borderRadius: '6px',
    marginBottom: '8px',
    fontSize: '13px',
  },
  widgetContent: {
    textAlign: 'center',
  },
  avatar: {
    margin: '28px 0',
  },
  avatarCircle: {
    width: 'clamp(92px, 28vw, 120px)',
    height: 'clamp(92px, 28vw, 120px)',
    borderRadius: '50%',
    backgroundColor: '#e3f2fd',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'clamp(34px, 11vw, 48px)',
    margin: '0 auto 16px',
  },
  callInfo: {
    fontSize: '0.94rem',
    lineHeight: 1.4,
    color: 'rgba(71, 85, 105, 0.95)',
    margin: '0 0 8px 0',
  },
  controls: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginTop: '8px',
    flexWrap: 'nowrap',
  },
  controlButton: {
    width: '56px',
    height: '44px',
    padding: 0,
    fontSize: '1.3rem',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#1d4ed8',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
  mutedButton: {
    backgroundColor: '#0ea5e9',
  },
  endButton: {
    width: '56px',
    height: '44px',
    padding: 0,
    fontSize: '1.3rem',
    border: 'none',
    borderRadius: '10px',
    backgroundColor: '#ef4444',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
}
