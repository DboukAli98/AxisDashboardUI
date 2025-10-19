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

        const invoiceEl = document.getElementById('item-invoice');
        if (!invoiceEl) { window.print(); return; }

        const win = window.open('', 'PRINT', 'width=420,height=700');
        if (!win) return;

        win.document.open();
        win.document.write(`
      <html>
        <head>
          <meta charSet="utf-8" />
          <title>Invoice #${transaction.transactionId}</title>
          <style>
            /* --- POS PAGE: 80mm roll --- */
            @page {
              size: 80mm auto;
              margin: 0 0 18mm 0; /* bottom margin to guarantee extra feed */
            }
            html, body {
              width: 80mm;
              margin: 0;
              padding: 0;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            /* Root container in popup */
            .pos-print {
              width: 76mm !important;          /* safe printable width */
              margin: 0 auto !important;
              padding: 5mm 2mm 16mm !important; /* extra bottom padding */
              box-sizing: border-box !important;
              page-break-inside: avoid !important;
              max-width: none !important;
            }

            /* Larger, receipt-friendly typography */
            .pos-print, .pos-print * {
              font-family: 'Courier New', ui-monospace, Menlo, Consolas, monospace !important;
              font-size: 15px !important;
              line-height: 1.5 !important;
              color: #000 !important;
            }

            /* Tailwind fallbacks (if stylesheet isn't loaded in popup) */
            .pos-print .text-xs { font-size: 12px !important; }
            .pos-print .text-sm { font-size: 15px !important; }
            .pos-print .text-lg { font-size: 18px !important; }
            .pos-print .text-xl { font-size: 20px !important; }
            .pos-print .text-2xl { font-size: 22px !important; }
            .pos-print .font-bold { font-weight: 700 !important; }
            .pos-print .font-semibold { font-weight: 600 !important; }
            .pos-print .border-b-2 { border-bottom-width: 1px !important; }
            .pos-print .border-dashed { border-style: dashed !important; }
            .pos-print .flex { display: flex !important; }
            .pos-print .justify-between { justify-content: space-between !important; }
            .pos-print .text-center { text-align: center !important; }
            .pos-print .mb-4 { margin-bottom: 8px !important; }
            .pos-print .pb-4 { padding-bottom: 8px !important; }
            .pos-print .mb-3 { margin-bottom: 8px !important; }
            .pos-print .mt-1 { margin-top: 4px !important; }
            .pos-print .print\\:hidden, .pos-print button { display: none !important; }

            /* Final spacer in case the driver trims trailing blanks */
            .pos-spacer { height: 20mm; width: 100%; display: block; }
          </style>
        </head>
        <body></body>
      </html>
    `);
        win.document.close();

        // (Optional) bring Tailwind/app styles into the popup so classes render
        document.querySelectorAll('link[rel="stylesheet"], style').forEach(n => {
            try { win.document.head.appendChild(n.cloneNode(true)); } catch {
                console.info('Could not clone stylesheet for print window.');
            }
        });

        const clone = invoiceEl.cloneNode(true) as HTMLElement;
        clone.classList.add('pos-print');
        win.document.body.appendChild(clone);

        const spacer = win.document.createElement('div');
        spacer.className = 'pos-spacer';
        win.document.body.appendChild(spacer);

        setTimeout(() => { win.focus(); win.print(); win.close(); }, 150);
    };

    const formattedDate = new Date(transaction.createdOn).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });

    // Screen/modal view (unchanged)
    return (
        <div id="item-invoice" className="bg-white p-6 max-w-sm mx-auto font-mono text-sm">
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
