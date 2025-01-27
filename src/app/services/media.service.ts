import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private localStream = new BehaviorSubject<MediaStream | null>(null);
  private remoteStream = new BehaviorSubject<MediaStream | null>(null);
  private availableDevices = new BehaviorSubject<MediaDeviceInfo[]>([]);

  localStream$ = this.localStream.asObservable();
  remoteStream$ = this.remoteStream.asObservable();
  availableDevices$ = this.availableDevices.asObservable();

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
}