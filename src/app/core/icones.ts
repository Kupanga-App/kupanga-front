import { Provider } from '@angular/core';
import {
  LUCIDE_ICONS, LucideIconProvider,
  Archive, Banknote, Bell, Building2, Calendar, Camera, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  Circle, CircleAlert, CircleCheck, ClipboardCheck, Clock, Compass, Download, Ellipsis, Eraser, Eye, EyeOff, FileCheck,
  FileText, House, Image, Inbox, Key, LocateFixed, Lock, LogIn, LogOut, Mail, MapPin, MessageCircle, Minus, Monitor,
  Moon, PenLine, Pencil, Phone, Plus, Receipt, RefreshCw, Search, Send, Share, SlidersHorizontal, Smartphone, SquarePlus, Sun, SunMedium,
  Trash2, User, UserPlus, WifiOff, X,
} from 'lucide-angular';

/**
 * Icônes Lucide disponibles dans `<kp-icon name="…">` (nom en kebab-case : `chevron-left`, `circle-check`…).
 * Une seule famille d'icônes dans toute l'application (AUDIT.md §5) ; seules celles-ci sont embarquées.
 */
export const ICONES = {
  Archive, Banknote, Bell, Building2, Calendar, Camera, Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight,
  Circle, CircleAlert, CircleCheck, ClipboardCheck, Clock, Compass, Download, Ellipsis, Eraser, Eye, EyeOff, FileCheck,
  FileText, House, Image, Inbox, Key, LocateFixed, Lock, LogIn, LogOut, Mail, MapPin, MessageCircle, Minus, Monitor,
  Moon, PenLine, Pencil, Phone, Plus, Receipt, RefreshCw, Search, Send, Share, SlidersHorizontal, Smartphone, SquarePlus, Sun, SunMedium,
  Trash2, User, UserPlus, WifiOff, X,
};

export function provideIcones(): Provider {
  return { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider(ICONES) };
}
