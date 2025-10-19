import React from 'react';
import { GameTransaction } from '../../services/transactionService';
import { getStatusName } from '../../services/statuses';

interface GameInvoiceProps {
    transaction: GameTransaction;
    onPrint?: () => void;
}

const GameInvoice: React.FC<GameInvoiceProps> = ({ transaction, onPrint }) => {
    const handlePrint = () => {
        if (onPrint) onPrint();
        window.print();
    };

    const formattedDate = new Date(transaction.createdOn).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <>
            <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #invoice, #invoice * {
            visibility: visible !important;
          }

          #invoice {
            position: fixed !important;
            left: 0;
            top: 0;
            width: 100%;
            page-break-before: avoid;
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          @page {
            size: A4; /* or 80mm auto for receipts */
            margin: 12mm;
          }

          html, body {
            margin: 0;
            padding: 0;
          }

          /* Optional: uncomment if slightly overflowing
          #invoice {
            transform: scale(0.95);
            transform-origin: top left;
          }
          */

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

            <div id="invoice" className="bg-white p-6 max-w-sm mx-auto font-mono text-sm">
                {/* Header */}
                <div className="text-center border-b-2 border-dashed border-gray-800 pb-4 mb-4">
                    <div className="text-xl font-bold mb-1">GAME SESSION</div>
                    <div className="text-xs">RECEIPT</div>
                    <div className="text-xs mt-2">{formattedDate}</div>
                    <div className="text-xs">Invoice #{transaction.transactionId}</div>
                </div>

                {/* Session Details */}
                <div className="space-y-1 border-b-2 border-dashed border-gray-800 pb-4 mb-4">
                    <div className="flex justify-between">
                        <span>Cashier:</span>
                        <span className="font-semibold">{transaction.createdBy || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Status:</span>
                        <span className="font-semibold">{getStatusName(transaction.statusId) || 'Unknown'}</span>
                    </div>
                    {transaction.roomName && (
                        <div className="flex justify-between">
                            <span>Room:</span>
                            <span className="font-semibold">{transaction.roomName}</span>
                        </div>
                    )}
                    {transaction.setName && (
                        <div className="flex justify-between">
                            <span>Set:</span>
                            <span className="font-semibold">{transaction.setName}</span>
                        </div>
                    )}
                    {transaction.gameName && (
                        <div className="flex justify-between">
                            <span>Game:</span>
                            <span className="font-semibold">{transaction.gameName}</span>
                        </div>
                    )}
                    {transaction.gameTypeName && (
                        <div className="flex justify-between">
                            <span>Type:</span>
                            <span className="font-semibold">{transaction.gameTypeName}</span>
                        </div>
                    )}
                    {transaction.gameCategoryName && (
                        <div className="flex justify-between">
                            <span>Category:</span>
                            <span className="font-semibold">{transaction.gameCategoryName}</span>
                        </div>
                    )}
                    {transaction.gameSettingName && (
                        <div className="flex justify-between">
                            <span>Setting:</span>
                            <span className="font-semibold">{transaction.gameSettingName}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span>Duration:</span>
                        <span className="font-semibold">
                            {transaction.hours === 0 ? 'Open Hour' : `${transaction.hours}h`}
                        </span>
                    </div>
                </div>

                {/* Items (if any) */}
                {transaction.items && transaction.items.length > 0 && (
                    <div className="border-b-2 border-dashed border-gray-800 pb-4 mb-4">
                        <div className="font-bold mb-2">ITEMS:</div>
                        {transaction.items.map((item, idx) => (
                            <div key={idx} className="mb-2">
                                <div className="flex justify-between">
                                    <span className="flex-1">{item.itemName}</span>
                                    <span className="w-16 text-right">${item.unitPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-600">
                                    <span className="pl-2">{item.categoryName}</span>
                                    <span>x{item.quantity}</span>
                                    <span className="w-16 text-right font-semibold">${item.lineTotal.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Total */}
                <div className="border-b-2 border-gray-800 pb-2 mb-4">
                    <div className="flex justify-between text-xl font-bold">
                        <span>TOTAL:</span>
                        <span>${transaction.totalPrice.toFixed(2)}</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-xs border-b-2 border-dashed border-gray-800 pb-4 mb-4">
                    <p>Thank you for your business!</p>
                    <p className="mt-1">Please come again</p>
                </div>

                {/* Print Button */}
                <div className="text-center print:hidden">
                    <button
                        onClick={handlePrint}
                        className="px-6 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition font-sans text-sm"
                    >
                        Print Receipt
                    </button>
                </div>
            </div>
        </>
    );
};

export default GameInvoice;
