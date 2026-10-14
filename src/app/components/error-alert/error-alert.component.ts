import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

/** Dumb component reutilizable: muestra un mensaje de error y avisa cuando se cierra. */
@Component({
  selector: 'app-error-alert',
  template: `
    <div class="card-panel red lighten-4 red-text text-darken-4 alert" *ngIf="message">
      <span>{{ message }}</span>
      <button class="btn-flat close" type="button" aria-label="Cerrar" (click)="dismiss.emit()">✕</button>
    </div>
  `,
  styles: [`
    .alert { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .close { padding: 0 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ErrorAlertComponent {
  @Input() message: string | null = null;
  @Output() dismiss = new EventEmitter<void>();
}
