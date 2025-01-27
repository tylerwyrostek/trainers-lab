import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatchmakingService } from '../../services/matchmaking.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './queue.component.html',
  styleUrls: ['./queue.component.scss']
})
export class QueueComponent implements OnDestroy {
  inQueue = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private matchmakingService: MatchmakingService,
    private router: Router
  ) {
    this.subscriptions.push(
      this.matchmakingService.queueStatus$.subscribe(
        status => this.inQueue = status
      ),
      this.matchmakingService.matchFound$.subscribe(match => {
        if (match) {
          this.router.navigate(['/lobby']);
        }
      })
    );
  }

  enterQueue() {
    this.matchmakingService.enterQueue();
  }

  leaveQueue() {
    this.matchmakingService.leaveQueue();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}