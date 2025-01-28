import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface MediaDevice {
  deviceId: string;
  label: string;
}

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private localStream = new BehaviorSubject<MediaStream | null>(null);
  private remoteStream = new BehaviorSubject<MediaStream | null>(null);
  private socket: Socket;

  localStream$ = this.localStream.asObservable();
  remoteStream$ = this.remoteStream.asObservable();
  private peerConnection: RTCPeerConnection | null = null;
  public isInQueue = new BehaviorSubject<boolean>(false);
  public isMatched = new BehaviorSubject<boolean>(false);
  private currentMatchId: string | null = null;
  private isUpdatingDevice = false;

  private videoInputDevices = new BehaviorSubject<MediaDevice[]>([]);
  private audioInputDevices = new BehaviorSubject<MediaDevice[]>([]);

  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() {
    this.socket = io('https://trainers-lab-api.onrender.com/');
    this.initializeMedia();
    this.setupSocketListeners();
  }

  private async initializeMedia() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${this.videoInputDevices.value.length + 1}`
        }));
      
      const audioDevices = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${this.audioInputDevices.value.length + 1}`
        }));

      this.videoInputDevices.next(videoDevices);
      this.audioInputDevices.next(audioDevices);
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  }

  public async startLocalStream(videoDeviceId?: string, audioDeviceId?: string): Promise<void> {
    try {
      if (this.localStream.value) {
        this.stopLocalStream();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
        audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true
      });

      this.localStream.next(stream);
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  public stopLocalStream(): void {
    if (this.localStream.value) {
      this.localStream.value.getTracks().forEach(track => track.stop());
      this.localStream.next(null);
    }
  }

  public async changeAudioInput(deviceId: string): Promise<void> {
    this.isUpdatingDevice = true;
    try {
      await this.startLocalStream(this.getCurrentVideoDevice()?.deviceId, deviceId);
      await this.updatePeerConnection();
      if (this.currentMatchId) {
        this.socket.emit('deviceChange', { matchId: this.currentMatchId });
      }
    } finally {
      this.isUpdatingDevice = false;
    }
  }

  public async changeVideoInput(deviceId: string): Promise<void> {
    this.isUpdatingDevice = true;
    try {
      await this.startLocalStream(deviceId, this.getCurrentAudioDevice()?.deviceId);
      await this.updatePeerConnection();
      if (this.currentMatchId) {
        this.socket.emit('deviceChange', { matchId: this.currentMatchId });
      }
    } finally {
      this.isUpdatingDevice = false;
    }
  }

  public enterQueue(): void {
    if (this.isInQueue.value) return;
    this.isInQueue.next(true);
    this.socket.emit('enterQueue');
  }

  public leaveQueue(): void {
    if (!this.isInQueue.value) return;
    this.socket.emit('leaveQueue');
    this.isInQueue.next(false);
  }

  private async setupPeerConnection(): Promise<void> {
    console.log(this.peerConnection);
    console.log(this.currentMatchId);
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(this.configuration);
    await this.startLocalStream();
    if (this.localStream.value) {
      this.localStream.value.getTracks().forEach(track => {
        if (this.localStream.value) {
          this.peerConnection!.addTrack(track, this.localStream.value);
        }
      });
    }

    this.peerConnection.ontrack = (event) => {
      this.remoteStream.next(event.streams[0]);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentMatchId) {
        this.socket.emit('iceCandidate', {
          matchId: this.currentMatchId,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection?.iceConnectionState === 'disconnected') {
        this.handlePeerDisconnect();
      }
    };
  }

  private async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('No peer connection');
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  private async handleOffer(offer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('No peer connection');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    console.log(this.currentMatchId);
    if (this.currentMatchId) {
      this.socket.emit('answer', {
        matchId: this.currentMatchId,
        answer
      });
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('No peer connection');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) throw new Error('No peer connection');
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  private handlePeerDisconnect(): void {
    this.remoteStream.next(null);
    this.isMatched.next(false);
    this.currentMatchId = null;
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  private async updatePeerConnection(): Promise<void> {
    if (!this.peerConnection) return;

    const senders = this.peerConnection.getSenders();
    senders.forEach(sender => this.peerConnection!.removeTrack(sender));

    if (this.localStream.value) {
      this.localStream.value.getTracks().forEach(track => {
        if (this.localStream.value) {
          this.peerConnection!.addTrack(track, this.localStream.value);
        }
      });
    }
  }

  private setupSocketListeners() {
    this.socket.on('queued', () => {
      console.log('Added to queue');
    });

    this.socket.on('matched', async ({ matchId, initiator }) => {
      console.log('Matched!', { matchId, initiator });
      this.currentMatchId = matchId;
      this.isInQueue.next(false);
      this.isMatched.next(true);

      await this.setupPeerConnection();
      
      if (initiator) {
        const offer = await this.createOffer();
        this.socket.emit('offer', { matchId, offer });
      }
    });

    this.socket.on('offer', async ({ matchId, offer }) => {
      if (this.currentMatchId !== matchId) return;
      await this.handleOffer(offer);
    });

    this.socket.on('answer', async ({ matchId, answer }) => {
      if (this.currentMatchId !== matchId) return;
      await this.handleAnswer(answer);
    });

    this.socket.on('iceCandidate', async ({ matchId, candidate }) => {
      if (this.currentMatchId !== matchId) return;
      await this.handleIceCandidate(candidate);
    });

    this.socket.on('peerDeviceChange', async ({ matchId }) => {
      if (this.currentMatchId !== matchId || this.isUpdatingDevice) return;
      // Renegotiate connection when peer changes device
      if (this.peerConnection?.signalingState === 'stable') {
        const offer = await this.createOffer();
        this.socket.emit('offer', { matchId, offer });
      }
    });

    this.socket.on('peerDisconnected', ({ matchId }) => {
      if (this.currentMatchId === matchId) {
        this.handlePeerDisconnect();
      }
    });
  }

  private getCurrentVideoDevice(): MediaDevice | undefined {
    const videoTrack = this.localStream.value?.getVideoTracks()[0];
    return this.videoInputDevices.value.find(
      device => device.deviceId === videoTrack?.getSettings().deviceId
    );
  }

  private getCurrentAudioDevice(): MediaDevice | undefined {
    const audioTrack = this.localStream.value?.getAudioTracks()[0];
    return this.audioInputDevices.value.find(
      device => device.deviceId === audioTrack?.getSettings().deviceId
    );
  }

  public getVideoInputDevices(): Observable<MediaDevice[]> {
    return this.videoInputDevices.asObservable();
  }

  public getAudioInputDevices(): Observable<MediaDevice[]> {
    return this.audioInputDevices.asObservable();
  }
}