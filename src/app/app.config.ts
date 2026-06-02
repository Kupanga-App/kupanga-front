import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { reducers } from './store/reducers';
import { effects } from './store/effects';
import { authInterceptor } from './core/auth/interceptors/auth.interceptor';
import { LUCIDE_ICONS, LucideIconProvider } from 'lucide-angular';
import {
  Home, Building, Building2, MapPin, Calendar, Users, UserPlus, FileText,
  ClipboardCheck, CreditCard, MessageSquare, Bell, Sun, Search, ChevronRight,
  ChevronDown, ArrowLeft, ArrowRight, ExternalLink, Image, Edit3, Settings, Check, X, Plus, Minus,
  DollarSign, Briefcase, Shield, Clock, AlertTriangle, CircleCheck, Award, Zap,
  Wind, Square, Info, Star, Eye, Maximize2, Layers, BarChart2, Percent, Upload,
  Trash2, GripVertical, PenLine, Phone, Mail, Send, Save, Key, Flame, Droplets,
  RefreshCw, User, Bed, Utensils, Receipt, FileCheck, ChevronLeft, SlidersHorizontal,
  // Icônes manquantes pour la feature mon-logement
  CheckCircle, Repeat, CalendarClock, Download, AlertCircle, Wrench, CheckSquare, LogOut,
  MessageCircle,
  // Icônes pour la feature biens listing
  LayoutGrid, LayoutList, Map, Ruler, LayoutDashboard, ArrowUpDown,
  School, Cross, Pill, Baby, Bus, ShoppingCart,
  // Icônes navbar
  Compass, Folder, HelpCircle, Lightbulb, Moon, Menu,
} from 'lucide-angular';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideAnimationsAsync(),
    provideNativeDateAdapter(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideStore(reducers),
    provideEffects(...effects),
    ...(isDevMode() ? [provideStoreDevtools({ maxAge: 25 })] : []),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'fill' } },
    {
      provide: LUCIDE_ICONS,
      multi: true,
      useValue: new LucideIconProvider({
        Home, Building, Building2, MapPin, Calendar, Users, UserPlus, FileText,
        ClipboardCheck, CreditCard, MessageSquare, Bell, Sun, Search, ChevronRight,
        ChevronDown, ArrowLeft, ArrowRight, ExternalLink, Image, Edit3, Settings, Check, X, Plus, Minus,
        DollarSign, Briefcase, Shield, Clock, AlertTriangle, CircleCheck, Award, Zap,
        Wind, Square, Info, Star, Eye, Maximize2, Layers, BarChart2, Percent, Upload,
        Trash2, GripVertical, PenLine, Phone, Mail, Send, Save, Key, Flame, Droplets,
        RefreshCw, User, Bed, Utensils, Receipt, FileCheck, ChevronLeft, SlidersHorizontal,
        CheckCircle, Repeat, CalendarClock, Download, AlertCircle, Wrench, CheckSquare, LogOut,
        MessageCircle,
        LayoutGrid, LayoutList, Map, Ruler, LayoutDashboard, ArrowUpDown,
        School, Cross, Pill, Baby, Bus, ShoppingCart,
        Compass, Folder, HelpCircle, Lightbulb, Moon, Menu,
      }),
    },
  ]
};
