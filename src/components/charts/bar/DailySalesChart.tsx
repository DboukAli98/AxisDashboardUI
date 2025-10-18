import { useEffect, useState } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import { getDailySales, DailySalesData } from "../../../services/transactionService";
import Loader from "../../ui/Loader";

type DateFilter = 'today' | '3days' | '2weeks' | 'month';

export default function DailySalesChart() {
    const [salesData, setSalesData] = useState<DailySalesData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateFilter, setDateFilter] = useState<DateFilter>('month');

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        setError(null);

        // Calculate date range based on filter
        const now = new Date();
        let from: Date;

        // Always set 'to' to end of today (23:59:59 UTC)
        const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

        switch (dateFilter) {
            case 'today':
                // Today: from 00:00:00 to 23:59:59 UTC of current date
                from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
                break;
            case '3days':
                // Last 3 days: 3 days ago at 00:00:00 to end of today
                from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 3, 0, 0, 0, 0));
                break;
            case '2weeks':
                // Last 2 weeks: 14 days ago at 00:00:00 to end of today
                from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 14, 0, 0, 0, 0));
                break;
            case 'month':
            default:
                // Last month: 30 days ago at 00:00:00 to end of today
                from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 30, 0, 0, 0, 0));
                break;
        }

        getDailySales({
            from: from.toISOString(),
            to: to.toISOString(),
        })
            .then((data) => {
                if (!mounted) return;
                setSalesData(data || []);
            })
            .catch((err) => {
                if (!mounted) return;
                const message = err?.message || "Failed to load daily sales data";
                setError(message);
            })
            .finally(() => {
                if (!mounted) return;
                setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [dateFilter]);

    // Prepare chart data
    const categories = salesData.map((d) => {
        const date = new Date(d.date);
        // Use UTC to avoid timezone issues
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC"
        });
    });

    const itemsData = salesData.map((d) => d.itemsTotal);
    const gamesData = salesData.map((d) => d.gamesTotal);
    const grandTotalData = salesData.map((d) => d.grandTotal);

    const options: ApexOptions = {
        colors: ["#3b82f6", "#10b981", "#6366f1"],
        chart: {
            fontFamily: "Outfit, sans-serif",
            type: "bar",
            height: 350,
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "55%",
                borderRadius: 5,
                borderRadiusApplication: "end",
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 4,
            colors: ["transparent"],
        },
        xaxis: {
            categories: categories.length > 0 ? categories : ["No data"],
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        legend: {
            show: true,
            position: "top",
            horizontalAlign: "left",
            fontFamily: "Outfit",
        },
        yaxis: {
            title: {
                text: "Sales ($)",
            },
        },
        grid: {
            yaxis: {
                lines: {
                    show: true,
                },
            },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            x: {
                show: true,
            },
            y: {
                formatter: (val: number) => `$${val.toFixed(2)}`,
            },
        },
    };

    const series = [
        {
            name: "Items Sales",
            data: itemsData.length > 0 ? itemsData : [0],
        },
        {
            name: "Games Sales",
            data: gamesData.length > 0 ? gamesData : [0],
        },
        {
            name: "Total Sales",
            data: grandTotalData.length > 0 ? grandTotalData : [0],
        },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600 bg-red-50 p-4 rounded">
                {error}
            </div>
        );
    }

    const filterButtons: { value: DateFilter; label: string }[] = [
        { value: 'today', label: 'Today' },
        { value: '3days', label: 'Last 3 Days' },
        { value: '2weeks', label: 'Last 2 Weeks' },
        { value: 'month', label: 'Last Month' },
    ];

    const exportToExcel = () => {
        if (salesData.length === 0) {
            alert('No data to export');
            return;
        }

        // Create CSV content
        const headers = ['Date', 'Items Sales ($)', 'Games Sales ($)', 'Total Sales ($)'];
        const rows = salesData.map((d) => {
            const date = new Date(d.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
            });
            return [
                formattedDate,
                d.itemsTotal.toFixed(2),
                d.gamesTotal.toFixed(2),
                d.grandTotal.toFixed(2),
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(',')),
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const filterLabel = filterButtons.find(b => b.value === dateFilter)?.label || 'Data';
        link.setAttribute('href', url);
        link.setAttribute('download', `Daily_Sales_${filterLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            {/* Date Filter Buttons and Export */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                    {filterButtons.map((btn) => (
                        <button
                            key={btn.value}
                            onClick={() => setDateFilter(btn.value)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${dateFilter === btn.value
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={exportToExcel}
                    disabled={salesData.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Export to Excel
                </button>
            </div>

            {/* Chart */}
            <div className="max-w-full overflow-x-auto custom-scrollbar">
                <div id="dailySalesChart" className="min-w-[1000px]">
                    <Chart options={options} series={series} type="bar" height={350} />
                </div>
            </div>
        </div>
    );
}
