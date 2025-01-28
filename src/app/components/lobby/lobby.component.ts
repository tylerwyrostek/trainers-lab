import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MediaService, MediaDevice } from '../../services/media.service';
import { Subscription } from 'rxjs';

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
  audioDevices: MediaDevice[] = [];
  videoDevices: MediaDevice[] = [];
  localStreamExpanded = false;
  showSettings = false;
  isInQueue = false;
  isMatched = false;
  private subscriptions: Subscription[] = [];


  constructor(private mediaService: MediaService) {




  }

  ngOnInit() {
    this.subscriptions.push(
      this.mediaService.localStream$.subscribe(
        stream => this.localStream = stream
      ),
      this.mediaService.remoteStream$.subscribe(
        stream => this.remoteStream = stream
      ),
      this.mediaService.getVideoInputDevices().subscribe(
        devices => this.videoDevices = devices
      ),
      this.mediaService.getAudioInputDevices().subscribe(
        devices => this.audioDevices = devices
      ),
      this.mediaService.isInQueue.subscribe(
        inQueue => this.isInQueue = inQueue
      ),
      this.mediaService.isMatched.subscribe(
        matched => this.isMatched = matched
      )
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.mediaService.stopLocalStream();
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
}