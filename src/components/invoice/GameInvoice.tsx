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
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
            {/* Header */}
            <div className="border-b-2 border-gray-300 pb-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
                        <p className="text-gray-600 mt-1">Game Session Receipt</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-600">Invoice #</p>
                        <p className="text-xl font-semibold text-gray-800">{transaction.transactionId}</p>
                        <p className="text-sm text-gray-600 mt-2">{formattedDate}</p>
                    </div>
                </div>
            </div>

            {/* Customer & Session Info */}
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Cashier</h3>
                    <p className="text-gray-800">{transaction.createdBy || 'N/A'}</p>
                </div>
                <div className="text-right">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase mb-2">Status</h3>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${transaction.statusId === 1
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                        {getStatusName(transaction.statusId) || 'Unknown'}
                    </span>
                </div>
            </div>

            {/* Game Details */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Session Details</h3>
                <div className="grid grid-cols-2 gap-4">
                    {transaction.roomName && (
                        <div>
                            <p className="text-sm text-gray-600">Room</p>
                            <p className="font-medium text-gray-800">{transaction.roomName}</p>
                        </div>
                    )}
                    {transaction.setName && (
                        <div>
                            <p className="text-sm text-gray-600">Set</p>
                            <p className="font-medium text-gray-800">{transaction.setName}</p>
                        </div>
                    )}
                    {transaction.gameName && (
                        <div>
                            <p className="text-sm text-gray-600">Game</p>
                            <p className="font-medium text-gray-800">{transaction.gameName}</p>
                        </div>
                    )}
                    {transaction.gameTypeName && (
                        <div>
                            <p className="text-sm text-gray-600">Game Type</p>
                            <p className="font-medium text-gray-800">{transaction.gameTypeName}</p>
                        </div>
                    )}
                    {transaction.gameCategoryName && (
                        <div>
                            <p className="text-sm text-gray-600">Category</p>
                            <p className="font-medium text-gray-800">{transaction.gameCategoryName}</p>
                        </div>
                    )}
                    {transaction.gameSettingName && (
                        <div>
                            <p className="text-sm text-gray-600">Setting</p>
                            <p className="font-medium text-gray-800">{transaction.gameSettingName}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-sm text-gray-600">Duration</p>
                        <p className="font-medium text-gray-800">
                            {transaction.hours === 0 ? 'Open Hour' : `${transaction.hours} hour${transaction.hours !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Items Table (if any) */}
            {transaction.items && transaction.items.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Items</h3>
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-300">
                                <th className="text-left py-2 text-sm font-semibold text-gray-600">Item</th>
                                <th className="text-center py-2 text-sm font-semibold text-gray-600">Qty</th>
                                <th className="text-right py-2 text-sm font-semibold text-gray-600">Price</th>
                                <th className="text-right py-2 text-sm font-semibold text-gray-600">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transaction.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-200">
                                    <td className="py-3 text-gray-800">
                                        <div>{item.itemName}</div>
                                        <div className="text-xs text-gray-500">{item.categoryName}</div>
                                    </td>
                                    <td className="py-3 text-center text-gray-800">{item.quantity}</td>
                                    <td className="py-3 text-right text-gray-800">${item.unitPrice.toFixed(2)}</td>
                                    <td className="py-3 text-right text-gray-800">${item.lineTotal.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Total */}
            <div className="border-t-2 border-gray-300 pt-4">
                <div className="flex justify-end">
                    <div className="w-64">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-2xl font-bold text-gray-800">Total</span>
                            <span className="text-2xl font-bold text-gray-800">
                                ${transaction.totalPrice.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-600">
                <p>Thank you for your business!</p>
            </div>

            {/* Print Button - Hidden when printing */}
            <div className="mt-6 text-center print:hidden">
                <button
                    onClick={handlePrint}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                    Print Invoice
                </button>
            </div>
        </div>
    );
};

export default GameInvoice;
