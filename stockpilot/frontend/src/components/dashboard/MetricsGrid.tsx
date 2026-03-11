import { Boxes, CircleAlert, PackageSearch, Store } from "lucide-react";
import type { OverviewMetrics } from "../../types/stock";
import { formatCurrency } from "../../utils/formatting";
import { KPICard } from "./KPICard";

interface MetricsGridProps {
    overview: OverviewMetrics;
}

export function MetricsGrid({ overview }: MetricsGridProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard
                label="Total SKUs"
                value={overview.totalSkus.toLocaleString()}
                detail={`${overview.stores} stores across the dataset`}
                icon={<Boxes className="h-5 w-5" />}
                tone="brand"
            />
            <KPICard
                label="Stock Value"
                value={formatCurrency(overview.totalStockValue)}
                detail="Current carrying value"
                icon={<Store className="h-5 w-5" />}
                tone="success"
            />
            <KPICard
                label="Low Stock"
                value={overview.lowStockItems.toLocaleString()}
                detail="Items below target coverage"
                icon={<CircleAlert className="h-5 w-5" />}
                tone="danger"
            />
            <KPICard
                label="Overstock"
                value={overview.overstockItems.toLocaleString()}
                detail="Items above 2x reorder point"
                icon={<PackageSearch className="h-5 w-5" />}
                tone="warning"
            />
        </div>
    );
}
