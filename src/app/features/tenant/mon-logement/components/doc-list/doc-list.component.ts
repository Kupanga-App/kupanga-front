import { Component, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { IconComponent } from '../../../../../shared/components/icon/icon.component';
import { BienDocument } from '../../models/tenant.models';

@Component({
  selector: 'kp-doc-list',
  standalone: true,
  imports: [IconComponent, DatePipe],
  templateUrl: './doc-list.component.html',
  styleUrl: './doc-list.component.scss',
})
export class DocListComponent {
  documents = input.required<BienDocument[]>();
  televerserDocument = output<void>();

  ouvrir(doc: BienDocument): void {
    if (doc.url && doc.url !== '#') {
      window.open(doc.url, '_blank');
    }
  }
}
