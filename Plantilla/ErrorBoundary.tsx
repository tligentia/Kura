import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-white flex items-center justify-center p-8 font-sans">
                    <div className="max-w-md w-full bg-white border-2 border-red-700 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(185,28,28,0.15)] text-center animate-in fade-in zoom-in duration-500">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 bg-red-700 rounded-3xl text-white shadow-xl">
                                <AlertCircle size={40} />
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-4">
                            Error de Sistema
                        </h1>
                        <p className="text-sm text-gray-600 leading-relaxed mb-8 font-medium">
                            Se ha detectado una anomalía crítica en la interfaz. El núcleo del sistema se ha detenido para proteger los datos.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-2xl mb-8 border border-gray-100 italic text-[10px] font-mono text-gray-400 break-words">
                            {this.state.error?.message || 'Error desconocido'}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="group w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-[0.98]"
                        >
                            Reiniciar Aplicación
                            <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
