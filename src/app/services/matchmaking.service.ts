import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Player {
  id: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class MatchmakingService {
  private queueStatus = new BehaviorSubject<boolean>(false);
  private matchFound = new BehaviorSubject<Player | null>(null);

  queueStatus$ = this.queueStatus.asObservable();
  matchFound$ = this.matchFound.asObservable();

  enterQueue() {
    this.queueStatus.next(true);
    // Simulate finding a match after 5 seconds
    setTimeout(() => {
      this.matchFound.next({ id: 'mock-id', name: 'Player 2' });
    }, 5000);
  }

  leaveQueue() {
    this.queueStatus.next(false);
    this.matchFound.next(null);
  }
}