import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from '../icon/icon.component';

export interface WizardStep {
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'kp-wizard-stepper',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './wizard-stepper.component.html',
  styleUrls: ['./wizard-stepper.component.scss'],
})
export class WizardStepperComponent {
  steps = input.required<WizardStep[]>();
  currentStep = input<number>(0);

  stepNumber(i: number): string {
    return String(i + 1).padStart(2, '0');
  }

  isDone(i: number): boolean {
    return i < this.currentStep();
  }

  isActive(i: number): boolean {
    return i === this.currentStep();
  }
}
