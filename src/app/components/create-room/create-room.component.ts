import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export enum GameFormat {
  STANDARD = 'Standard',
  GLC = 'GLC',
  EXPANDED = 'Expanded',
  OTHER = 'Other'
}

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.scss']
})
export class CreateRoomComponent {
  GameFormat = GameFormat;
  roomType: 'public' | 'private' = 'public';
  selectedFormat: GameFormat = GameFormat.STANDARD;
  customFormatName: string = '';

  constructor(private router: Router) {}

  createRoom() {
    const format = this.selectedFormat === GameFormat.OTHER 
      ? this.customFormatName 
      : this.selectedFormat;
      
    // TODO: Implement room creation logic
    console.log('Creating room:', {
      type: this.roomType,
      format
    });
  }
}