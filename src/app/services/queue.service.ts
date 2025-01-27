import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  constructor(private router: Router) {}

  enterQueue(type: 'casual' | 'ranked') {
    // TODO: Implement real queue logic
    setTimeout(() => {
      this.router.navigate(['/lobby']);
    }, 3000);
  }

  leaveQueue() {
    // TODO: Implement leave queue logic
  }
}