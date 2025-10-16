import React from 'react';
import { ItemTransaction } from '../../services/transactionService';
import { getStatusName } from '../../services/statuses';

interface ItemInvoiceProps {
    transaction: ItemTransaction;
    onPrint?: () => void;
}

const ItemInvoice: React.FC<ItemInvoiceProps> = ({ transaction, onPrint }) => {
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
        <div className="bg-white p-6 max-w-sm mx-auto font-mono text-sm">
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-gray-800 pb-4 mb-4">
                <div className="text-xl font-bold mb-1">ORDER RECEIPT</div>
                <div className="text-xs">AXIS COFFEE SHOP</div>
                <div className="text-xs mt-2">{formattedDate}</div>
                <div className="text-xs">Invoice #{transaction.transactionId}</div>
            </div>

            {/* Order Info */}
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
            </div>

            {/* Items */}
            <div className="border-b-2 border-dashed border-gray-800 pb-4 mb-4">
                <div className="font-bold mb-2">ITEMS:</div>
                {transaction.items && transaction.items.length > 0 ? (
                    transaction.items.map((item, idx) => (
                        <div key={idx} className="mb-3">
                            <div className="flex justify-between items-start">
                                <span className="flex-1 font-medium">{item.itemName}</span>
                                <span className="w-16 text-right">${item.unitPrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                                <span className="pl-2">{item.categoryName}</span>
                                <span>x{item.quantity}</span>
                                <span className="w-16 text-right font-semibold">${item.lineTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-gray-500 py-2">No items</div>
                )}
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b-2 border-gray-800 pb-2 mb-4">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${transaction.totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>$0.00</span>
                </div>
                <div className="flex justify-between text-xl font-bold mt-2">
                    <span>TOTAL:</span>
                    <span>${transaction.totalPrice.toFixed(2)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs border-b-2 border-dashed border-gray-800 pb-4 mb-4">
                <p>Thank you for your order at AXIS COFFEE SHOP!</p>
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
    );
};

export default ItemInvoice;
