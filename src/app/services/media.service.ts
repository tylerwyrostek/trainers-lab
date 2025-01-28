import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private localStream = new BehaviorSubject<MediaStream | null>(null);
  private remoteStream = new BehaviorSubject<MediaStream | null>(null);
  private availableDevices = new BehaviorSubject<MediaDeviceInfo[]>([]);
  private socket: Socket;

  localStream$ = this.localStream.asObservable();
  remoteStream$ = this.remoteStream.asObservable();
  availableDevices$ = this.availableDevices.asObservable();
  private peerConnection: RTCPeerConnection | null = null;
  public isInQueue = new BehaviorSubject<boolean>(false);
  public isMatched = new BehaviorSubject<boolean>(false);
  private currentMatchId: string | null = null;

  private configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor() {
    this.socket = io('http://localhost:3000');
    this.initializeMedia();
    this.setupSocketListeners();
  }

  async initializeMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      this.localStream.next(stream);
      await this.updateAvailableDevices();
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  }

  async updateAvailableDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.availableDevices.next(devices);
  }

  async changeAudioInput(deviceId: string) {
    const currentStream = this.localStream.value;
    if (currentStream) {
      currentStream.getAudioTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
        video: currentStream.getVideoTracks()[0].getSettings()
      });
      const videoTrack = currentStream.getVideoTracks()[0];
      const audioTrack = newStream.getAudioTracks()[0];
      const combinedStream = new MediaStream([videoTrack, audioTrack]);
      this.localStream.next(combinedStream);
    }
  }

  async changeVideoInput(deviceId: string) {
    const currentStream = this.localStream.value;
    if (currentStream) {
      currentStream.getVideoTracks().forEach(track => track.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: currentStream.getAudioTracks()[0].getSettings()
      });
      const audioTrack = currentStream.getAudioTracks()[0];
      const videoTrack = newStream.getVideoTracks()[0];
      const combinedStream = new MediaStream([videoTrack, audioTrack]);
      this.localStream.next(combinedStream);
    }
  }

  cleanup() {
    const stream = this.localStream.value;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    this.localStream.next(null);
    this.remoteStream.next(null);
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
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    this.peerConnection = new RTCPeerConnection(this.configuration);
    
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

    this.socket.on('peerDisconnected', ({ matchId }) => {
      if (this.currentMatchId === matchId) {
        this.handlePeerDisconnect();
      }
    });
  }
}