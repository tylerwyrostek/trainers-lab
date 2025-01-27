import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { HomeComponent } from './app/components/home/home.component';
import { LobbyComponent } from './app/components/lobby/lobby.component';
import { CreateRoomComponent } from './app/components/create-room/create-room.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <main>
      <router-outlet></router-outlet>
    </main>
  `
})
export class App {}

bootstrapApplication(App, {
  providers: [
    provideRouter([
      { path: '', component: HomeComponent },
      { path: 'lobby', component: LobbyComponent },
      { path: 'create-room', component: CreateRoomComponent },
      { path: '**', redirectTo: '' }
    ])
  ]
});