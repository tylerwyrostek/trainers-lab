import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QueueService } from '../../services/queue.service';

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

  constructor(
    private router: Router,
    private queueService: QueueService
  ) {}

  openQueueModal(type: 'casual' | 'ranked') {
    this.queueType = type;
    this.showQueueModal = true;
    this.queueService.enterQueue(type);
  }

  cancelQueue() {
    this.showQueueModal = false;
    this.queueType = null;
    this.queueService.leaveQueue();
  }

  navigateToCreateRoom() {
    this.router.navigate(['/create-room']);
  }
}