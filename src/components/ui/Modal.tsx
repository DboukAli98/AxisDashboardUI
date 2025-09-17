import { ReactNode } from "react";

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children?: ReactNode;
    className?: string;
    showCloseButton?: boolean;
    isFullscreen?: boolean;
};

export default function Modal({ isOpen, onClose, title, children, className = '', showCloseButton = true, isFullscreen = false }: ModalProps) {
    if (!isOpen) return null;

    const containerClasses = isFullscreen ? 'w-full h-full' : 'max-w-lg w-full';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={`relative z-10 ${containerClasses} mx-4 pointer-events-auto ${className}`}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/[0.03]">
                        <h3 className="text-lg font-medium">{title}</h3>
                        {showCloseButton && (
                            <button className="text-gray-500 hover:text-gray-700" onClick={onClose} aria-label="Close">✕</button>
                        )}
                    </div>
                    <div className="p-4">{children}</div>
                </div>
            </div>
        </div>
    );
}
