import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

export function Footer() {
  return (
    <footer className="mt-16 py-8 bg-gray-50 border-t">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-center sm:text-left">
            <p className="text-sm text-gray-600">
              © 2024 CalenSync Bot. Tutti i diritti riservati.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Sincronizzazione sicura tra Google Calendar e Telegram
            </p>
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <Link 
              href="/privacy" 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <Link 
              href="/terms" 
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              Termini di Servizio
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}