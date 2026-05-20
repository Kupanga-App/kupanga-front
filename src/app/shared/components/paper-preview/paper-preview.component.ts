import { Component, input } from '@angular/core';

@Component({
  selector: 'kp-paper',
  standalone: true,
  template: `
    <div class="paper">
      <span class="preview-tag">Aperçu</span>
      <ng-content />
    </div>
  `,
  styleUrls: ['./paper-preview.component.scss'],
})
export class PaperPreviewComponent {}
