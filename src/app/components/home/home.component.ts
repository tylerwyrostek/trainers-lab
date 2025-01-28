import { MediaService } from './../../services/media.service';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

export enum GameFormat {
  STANDARD = 'Standard',
  GLC = 'GLC',
  EXPANDED = 'Expanded',
  OTHER = 'Other'
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./home.component.html",
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  showQueueModal = false;
  queueType: 'casual' | 'ranked' | null = null;

  isInQueue = false;
  isMatched = false;

  constructor(
    private router: Router,
    private mediaService: MediaService
  ) {
    this.mediaService.isInQueue.subscribe(
      inQueue => this.isInQueue = inQueue
    );
    this.mediaService.isMatched.subscribe(
      matched => {
        this.isMatched = matched;
        if(this.isMatched) this.router.navigate(['/lobby']);
        
      }
    );
  }

  openQueueModal(type: 'casual' | 'ranked') {
    this.queueType = type;
    this.showQueueModal = true;
    this.mediaService.enterQueue();
  }

  cancelQueue() {
    this.showQueueModal = false;
    this.queueType = null;
    this.mediaService.leaveQueue();
  }

  navigateToCreateRoom() {
    this.router.navigate(['/create-room']);
  }
}