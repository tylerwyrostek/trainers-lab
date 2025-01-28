import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService } from '../../services/media.service';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit, OnDestroy {
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  audioDevices: MediaDeviceInfo[] = [];
  videoDevices: MediaDeviceInfo[] = [];
  localStreamExpanded = false;
  showSettings = false;


  constructor(private mediaService: MediaService) {
    this.mediaService.localStream$.subscribe(
      stream => this.localStream = stream
    );
    this.mediaService.remoteStream$.subscribe(
      stream => this.remoteStream = stream
    );
    this.mediaService.availableDevices$.subscribe(devices => {
      this.audioDevices = devices.filter(d => d.kind === 'audioinput');
      this.videoDevices = devices.filter(d => d.kind === 'videoinput');
    });

  }

  async ngOnInit() {
    await this.mediaService.initializeMedia();
    this.mediaService.leaveQueue();
  }

  async onAudioDeviceChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      await this.mediaService.changeAudioInput(select.value);
    }
  }

  async onVideoDeviceChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      await this.mediaService.changeVideoInput(select.value);
    }
  }

  toggleLocalStream() {
    this.localStreamExpanded = !this.localStreamExpanded;
  }

  toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  sendMessage(event: Event) {
    const input = event.target as HTMLInputElement;
    // TODO: Implement chat functionality
    input.value = '';
  }

  ngOnDestroy() {
    this.mediaService.cleanup();
  }
}